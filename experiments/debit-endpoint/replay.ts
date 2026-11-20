import type { PGlite } from "@electric-sql/pglite";
import type { debit } from "./handler.ts";
import { withPostgres } from "./postgres.ts";
import { makeDebitRoute } from "./route.ts";

interface State {
  balances: Record<string, string>;
  receipts: string[];
}

type Outcome = State & { status: string };
type DebitRequest = Parameters<typeof debit>[2] & { tenantId: string };

export interface ReplayWitness {
  scenario: string;
  tenantId: string;
  accountId: string;
  requestId: string;
  amountCents: string;
  before: State;
  observed: Outcome;
  http?: {
    method: string;
    path: string;
    input: Record<string, string>;
    status: number;
    result: string;
  };
}

export interface DebitReplay {
  engine: string;
  checks: string[];
  witness?: ReplayWitness;
}

async function readStatus(response: Response): Promise<string> {
  const body: unknown = await response.json();
  const status = body && typeof body === "object" && "status" in body ? body.status : undefined;
  if (response.status === (status === "declined" ? 409 : 200)) {
    return typeof status === "string" ? status : JSON.stringify(status) ?? "undefined";
  }
  throw new Error(`Unexpected debit HTTP response: ${response.status} ${JSON.stringify(body)}`);
}

async function snapshot(db: PGlite): Promise<State> {
  const accounts = await db.query<{ tenant_id: string; account_id: string; cents: string }>(
    "SELECT tenant_id, account_id, balance::text AS cents FROM accounts ORDER BY tenant_id, account_id",
  );
  const requests = await db.query<{ tenant_id: string; request_id: string }>(
    "SELECT tenant_id, request_id FROM debit_requests ORDER BY tenant_id, request_id",
  );
  return {
    balances: Object.fromEntries(accounts.rows.map(row => [`${row.tenant_id}/${row.account_id}`, row.cents])),
    receipts: requests.rows.map(row => `${row.tenant_id}/${row.request_id}`),
  };
}

export async function replayDebit(
  handler: typeof debit,
  schema: string,
  violates: (observation: ReplayWitness) => boolean,
): Promise<DebitReplay> {
  const post = makeDebitRoute(handler);
  return withPostgres(schema, async db => {
    await db.exec(`INSERT INTO accounts (tenant_id, account_id, balance) VALUES
      ('acme', 'primary', 100), ('acme', 'reserve', 40), ('birch', 'primary', 100)`);
    const version = await db.query<{ version: string }>("SELECT current_setting('server_version') AS version");
    const report: DebitReplay = { engine: `PostgreSQL ${version.rows[0]!.version} (PGlite)`, checks: [] };
    const first = { tenantId: "acme", accountId: "primary", requestId: "order-1", amountCents: 30n };
    const larger = { ...first, requestId: "order-2", amountCents: 90n };
    const cases: { scenario: string; request: DebitRequest; topUp?: boolean }[] = [
      { scenario: "debit only the requested tenant and account", request: first },
      { scenario: "retry a committed request", request: first },
      { scenario: "reuse a request ID in a different tenant", request: { ...first, tenantId: "birch" } },
      { scenario: "decline when funds are insufficient", request: larger },
      { scenario: "retry a declined request after topping up", request: larger, topUp: true },
      { scenario: "decline an unknown account", request: { ...first, requestId: "order-3", accountId: "missing" } },
    ];

    for (const { scenario, request, topUp } of cases) {
      if (topUp) {
        await db.query("UPDATE accounts SET balance = balance + 20 WHERE tenant_id = $1 AND account_id = $2",
          [request.tenantId, request.accountId]);
      }
      const { tenantId, accountId, requestId, amountCents } = request;
      const before = await snapshot(db);
      const body = { accountId, requestId, amountCents: amountCents.toString() };
      const http = new Request("https://billing.example/debit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const response = await post(http, { db, auth: { tenantId } });
      const actualStatus = await readStatus(response);
      // Release any work abandoned by an early return. The contract observes
      // committed balances and receipts, including when the handler leaks a transaction.
      await db.exec("ROLLBACK");
      const observed: Outcome = { ...await snapshot(db), status: actualStatus };
      const observation: ReplayWitness = {
        scenario, tenantId, ...body, before, observed,
        http: { method: http.method, path: new URL(http.url).pathname, input: { tenantId, ...body },
          status: response.status, result: actualStatus },
      };
      if (violates(observation)) {
        report.witness = observation;
        return report;
      }
      report.checks.push(scenario);
    }
    return report;
  });
}
