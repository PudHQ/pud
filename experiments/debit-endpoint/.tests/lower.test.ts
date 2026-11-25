import { expect, test } from "bun:test";
import { lower } from "../internal/lower.ts";

const handler = await Bun.file(new URL("../handler.ts", import.meta.url)).text();
const schema = await Bun.file(new URL("../schema.sql", import.meta.url)).text();

function edit(before: string | RegExp, after: string): string {
  const changed = handler.replace(before, after);
  expect(changed).not.toBe(handler);
  return changed;
}

test("the transaction model tracks the actual bind arguments and SQL placeholders", () => {
  const original = lower(handler, schema).body;
  const swappedArguments = edit(/\[\s*tenantId,\s*accountId,/, "[accountId, tenantId,");
  const swappedPlaceholders = edit("($1::text, $2::text", "($2::text, $1::text");
  const swappedModel = lower(swappedArguments, schema).body;
  expect(swappedModel).not.toEqual(original);
  expect(lower(swappedPlaceholders, schema).body).toEqual(swappedModel);
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
  expect(lower("// reviewed\n" + commented, "-- schema\n" + schema).body).toEqual(lower(handler, schema).body);
});

test("SQL aliases, direct bind parameters and migration ordering have the same transaction model", () => {
  const rewritten = edit(/UPDATE accounts AS a[\s\S]*?RETURNING a\.account_id/, `UPDATE accounts
    SET balance = balance - $3::bigint
    WHERE tenant_id = $1 AND account_id = $2 AND balance >= $3
    RETURNING account_id`);
  const reordered = `
    CREATE TABLE debit_requests (request_id text, tenant_id text, PRIMARY KEY (request_id, tenant_id));
    CREATE TABLE audit_log (entry text NOT NULL);
    CREATE TABLE accounts (
      balance bigint NOT NULL, account_id text, tenant_id text, CHECK (balance >= 0), PRIMARY KEY (account_id, tenant_id)
    );`;
  const model = lower(handler, schema).body;
  expect(lower(rewritten, reordered).body).toEqual(model);
  const aliases = handler.replace("accounts AS a ", "accounts AS wallet ").replaceAll(/\ba\./g, "wallet.")
    .replace("AS r(", "AS debit_row(").replaceAll(/\br\./g, "debit_row.");
  expect(lower(aliases, schema).body).toEqual(model);
  expect(() => lower(rewritten, reordered.replace("balance bigint NOT NULL", "balance bigint"))).toThrow("schema");
  expect(() => lower(rewritten, reordered.replace("CHECK (balance >= 0), ", ""))).toThrow("schema");
});
