import { withPostgres, type PGlite } from "@pud/postgres";
import type { debit, Session } from "./handler.ts";
import { makeDebitRoute } from "./route.ts";

interface State {
  balances: Record<string, string>;
  receipts: string[];
}

type Outcome = State & { status: string; transactionIssue?: string; threw?: string };
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
    status?: number;
    result: string;
  };
}

export interface DebitReplay {
  engine: string;
  /** Scenarios visited, in execution order. The caller judges each observation. */
  checks: string[];
}

async function readStatus(response: Response): Promise<string> {
  const body: unknown = await response.json();
  const status = body && typeof body === "object" && "status" in body ? body.status : undefined;
  if (response.status === (status === "declined" ? 409 : 200)) {
    return typeof status === "string" ? status : JSON.stringify(status) ?? "undefined";
  }
  throw new Error(`Unexpected debit HTTP response: ${response.status} ${JSON.stringify(body)}`);
}

async function observeCall(handler: typeof debit, db: PGlite, http: Request, tenantId: string) {
  let started = false, transactionIssue: string | undefined, databaseError: unknown;
  const session: Session = {
    async query(sql, params) {
      const open = db.isInTransaction();
      try {
        const result = await db.query(sql, params);
        if (result.command === "BEGIN") {
          if (started) transactionIssue ??= "started a second transaction";
          started = true;
        } else if (!open) {
          transactionIssue ??= `${result.command} ran outside a transaction`;
        }
        return result;
      } catch (error) {
        databaseError = error;
        throw error;
      }
    },
  };
  let threw: string | undefined;
  const post = makeDebitRoute(async (...args) => {
    try { return await handler(...args); }
    catch (error) {
      if (error !== databaseError) threw = String(error);
      throw error;
    }
  });
  let response: Response | undefined;
  try { response = await post(http, { db: session, auth: { tenantId } }); }
  catch (error) { if (threw === undefined) throw error; }
  const status = response ? await readStatus(response) : `threw ${threw}`;
  if (db.isInTransaction()) {
    transactionIssue ??= "still open when the handler returned";
    await db.exec("ROLLBACK");
  }
  return { status, httpStatus: response?.status, ...(threw !== undefined && { threw }), ...(transactionIssue && { transactionIssue }) };
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
  visit: (observation: ReplayWitness) => boolean,
  queries: readonly string[] = [],
): Promise<DebitReplay> {
  return withPostgres(schema, async db => {
    // Ask Postgres to resolve every modelled statement, including paths absent from replay.
    for (const sql of queries) {
      await db.exec(`PREPARE pud_check_query AS ${sql}`);
      await db.exec("DEALLOCATE pud_check_query");
    }
    await db.exec(`INSERT INTO accounts (tenant_id, account_id, balance) VALUES
      ('acme', 'primary', 100), ('acme', 'reserve', 40), ('birch', 'primary', 100), ('birch', 'savings', 100)`);
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
      { scenario: "decline an account owned only by another tenant", request: { ...first, requestId: "order-3", accountId: "savings" } },
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
      const { httpStatus, ...outcome } = await observeCall(handler, db, http, tenantId);
      const observed: Outcome = { ...await snapshot(db), ...outcome };
      const observation: ReplayWitness = {
        scenario, tenantId, ...body, before, observed,
        http: { method: http.method, path: new URL(http.url).pathname, input: { tenantId, ...body },
          status: httpStatus, result: outcome.status },
      };
      report.checks.push(scenario);
      if (visit(observation)) break;
    }
    return report;
  });
}
