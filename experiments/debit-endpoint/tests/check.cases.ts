import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contracts } from "../internal/contracts.ts";
import { check } from "../lib.ts";
import { checkHttpRoute } from "./http.ts";

const example = new URL("../", import.meta.url);
const original = await readFile(new URL("handler.ts", example), "utf8");
const schema = await readFile(new URL("schema.sql", example), "utf8");

test("HTTP routing and input validation run through an actual PostgreSQL ledger", checkHttpRoute, 20_000);

test("contract comments stay attached after formatting; malformed or missing contracts cannot pass", () => {
  expect(contracts(original.replace("//@ ensures debit:", "// @ ensures debit:")).map(c => c.name)).toEqual(["debit", "decline", "retry"]);
  expect(() => contracts(original.replace("seen(request)", "mystery(request)"))).toThrow("unsupported contract term");
  expect(() => contracts(original.replace("ensures retry:", "ensures debit:"))).toThrow("duplicate contract");
  expect(() => contracts(original.replace(/^\/\/@ ensures.*$/gm, ""))).toThrow("at least one");
});

test("the same check API proves, refutes, and refuses unsupported SQL", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-debit-cases-"));
  try {
    const file = join(dir, "handler.ts");
    await writeFile(join(dir, "schema.sql"), schema);
    await writeFile(file, original);
    const good = await check(file);
    expect(good.status).toBe("proved");
    if (good.status !== "proved") throw new Error(JSON.stringify(good));
    expect(good.contracts.map(c => c.name)).toEqual(["debit", "decline", "retry"]);
    expect(good.replay.checks).toHaveLength(6);

    await writeFile(file, original.replace("a.tenant_id = r.tenant_id AND ", ""));
    const bad = await check(file);
    expect(bad.status).toBe("disproved");
    if (bad.status !== "disproved") throw new Error(JSON.stringify(bad));
    expect(bad.contracts.map(c => c.status)).toEqual(["disproved", "unproved", "proved"]);
    expect(bad.counterexample?.before.balances["birch/primary"]).toBe("100");
    expect(bad.counterexample?.observed.balances["birch/primary"]).toBe("70");
    expect(bad.modelDisagreement).toBeUndefined();

    await writeFile(file, original.replace("SERIALIZABLE", "READ COMMITTED"));
    expect((await check(file)).status).toBe("unsupported");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 90_000);
