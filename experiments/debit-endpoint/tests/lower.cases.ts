import { expect, test } from "bun:test";
import { lower } from "../internal/lower.ts";

const handler = await Bun.file(new URL("../handler.ts", import.meta.url)).text();
const schema = await Bun.file(new URL("../schema.sql", import.meta.url)).text();

function edit(before: string | RegExp, after: string): string {
  const changed = handler.replace(before, after);
  expect(changed).not.toBe(handler);
  return changed;
}

test("Dafny sees the selected SQL column, placeholder, and actual argument", () => {
  expect(lower(handler, schema).sql).toContain("k.tenant == q.tenant");
  expect(lower(edit("a.tenant_id = r.tenant_id AND ", ""), schema).sql).not.toContain("k.tenant ==");
  expect(lower(edit(/\[\s*tenantId,\s*accountId,/, "[accountId, tenantId,"), schema).sql).toContain("k.tenant == q.account");
  expect(lower(edit("($1::text, $2::text", "($2::text, $1::text"), schema).sql).toContain("k.tenant == q.account");
  expect(lower(edit(/\[\s*tenantId,\s*requestId,?\s*\]/, "[requestId, tenantId]"), schema).sql).toContain("ReceiptKey(q.requestId, q.tenant)");
});

test("only the supported transaction protocol and migration are admitted", () => {
  for (const [before, after] of [
    ["LEVEL SERIALIZABLE", "LEVEL READ COMMITTED"],
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
  expect(lower("// reviewed\n" + commented, "-- schema\n" + schema)).toEqual(lower(handler, schema));
});
