import assert from "node:assert/strict";
import { withPostgres } from "@pud/postgres";
import { postDebit } from "../route.ts";

export async function checkHttpRoute(): Promise<void> {
  const schema = await Bun.file(new URL("../schema.sql", import.meta.url)).text();
  await withPostgres(schema, async db => {
    await db.exec(`INSERT INTO accounts (tenant_id, account_id, balance) VALUES
      ('acme', 'wallet', 9223372036854775807), ('birch', 'wallet', 75)`);
    const context = { db, auth: { tenantId: "acme" } };
    const url = "https://billing.example/debit";
    const post = (body: string) => postDebit(new Request(url, {
      method: "POST", headers: { "content-type": "application/json" }, body,
    }), context);
    const input = { accountId: "wallet", requestId: "order-1", amountCents: "9223372036854775807" };

    const get = await postDebit(new Request(url), context);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get("allow"), "POST");
    assert.equal((await post("{")).status, 400);
    assert.equal((await post(JSON.stringify({ ...input, tenantId: "birch" }))).status, 400);
    for (const badAmount of [1, "01", "0", "-3", "1.5", "1e2", "9223372036854775808"]) {
      assert.equal((await post(JSON.stringify({ ...input, amountCents: badAmount }))).status, 400);
    }
    for (const expected of ["applied", "duplicate"]) {
      const response = await post(JSON.stringify(input));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: expected });
    }
    const declined = await post(JSON.stringify({ ...input, amountCents: "1", requestId: "order-2" }));
    assert.equal(declined.status, 409);
    assert.deepEqual(await declined.json(), { status: "declined" });
    assert.deepEqual((await db.query("SELECT tenant_id, balance::text FROM accounts ORDER BY tenant_id")).rows,
      [{ tenant_id: "acme", balance: "0" }, { tenant_id: "birch", balance: "75" }]);
    assert.deepEqual((await db.query("SELECT tenant_id, request_id FROM debit_requests")).rows,
      [{ tenant_id: "acme", request_id: "order-1" }]);
  });
}
