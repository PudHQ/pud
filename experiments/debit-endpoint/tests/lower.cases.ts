import { expect, test } from "bun:test";
import { lower } from "../internal/lower.ts";

const handler = await Bun.file(new URL("../handler.ts", import.meta.url)).text();
const schema = await Bun.file(new URL("../schema.sql", import.meta.url)).text();

function edit(before: string, after: string): string {
  expect(handler).toContain(before);
  return handler.replace(before, after);
}

test("Dafny sees the selected SQL column, placeholder, and actual argument", () => {
  expect(lower(handler, schema)).toContain("k.tenant == q.tenant");
  expect(lower(edit("a.tenant_id = r.tenant_id AND ", ""), schema)).not.toContain("k.tenant ==");
  expect(lower(edit("[tenantId, accountId,", "[accountId, tenantId,"), schema)).toContain("k.tenant == q.account");
  expect(lower(edit("($1::text, $2::text", "($2::text, $1::text"), schema)).toContain("k.tenant == q.account");
  expect(lower(edit("[tenantId, requestId]", "[requestId, tenantId]"), schema)).toContain("ReceiptKey(q.requestId, q.tenant)");
});

test("only the supported transaction protocol and migration are admitted", () => {
  for (const [before, after] of [
    ["LEVEL SERIALIZABLE", "LEVEL READ COMMITTED"],
    ['await db.query("ROLLBACK");', 'await db.query("COMMIT");'],
    ["return \"applied\";", "return \"declined\";"],
    ["amountCents.toString()", "Number(amountCents).toString()"],
    [" AND a.balance >= r.amount", ""],
    ["a.balance - r.amount", "a.balance + r.amount"],
    ["RETURNING a.account_id", "RETURNING a.account_id; DELETE FROM accounts"],
  ]) {
    expect(() => lower(edit(before!, after!), schema)).toThrow();
  }
  expect(() => lower(handler, schema.replace("PRIMARY KEY (tenant_id, account_id)", "PRIMARY KEY (account_id)"))).toThrow();
});

test("source and SQL comments do not change the property", () => {
  const commented = edit("a.balance - r.amount", "a.balance /* base /* nested */ */ - r.amount");
  expect(lower("// reviewed\n" + commented, "-- schema\n" + schema)).toBe(lower(handler, schema));
});
