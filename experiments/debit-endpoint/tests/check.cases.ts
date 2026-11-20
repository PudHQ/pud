import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { contracts } from "../internal/contracts.ts";
import { check } from "../lib.ts";
import { format } from "../reporter.ts";
import { checkHttpRoute } from "./http.ts";
import type { Report } from "../lib.ts";

const example = new URL("../", import.meta.url);
const original = await readFile(new URL("handler.ts", example), "utf8");
const schema = await readFile(new URL("schema.sql", example), "utf8");

test("HTTP routing and input validation run through an actual PostgreSQL ledger", checkHttpRoute, 20_000);

test("contract comments stay attached after formatting; malformed or missing contracts cannot pass", () => {
  const legacy = original.replace(/(ensures \w+) "[^"]+":/g, "$1:");
  expect(contracts(legacy.replace("//@ ensures debit:", "// @ ensures debit:")).map(c => c.name)).toEqual(["debit", "decline", "retry"]);
  const titled = contracts(original)[0]!;
  expect(titled.title).toBe("Charge only the requested account");
  expect(titled.postcondition).toBe(contracts(legacy)[0]!.postcondition);
  expect(() => contracts(original.replace("seen(request)", "mystery(request)"))).toThrow("unsupported contract term");
  expect(() => contracts(original.replace("ensures retry ", "ensures debit "))).toThrow("duplicate contract");
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
    const passing = stripVTControlCharacters(format(good));
    expect(passing).toContain("3 proved");
    expect(passing).toContain("6 HTTP replays passed");

    await writeFile(file, original.replace("a.tenant_id = r.tenant_id AND ", ""));
    const bad = await check(file);
    expect(bad.status).toBe("disproved");
    if (bad.status !== "disproved") throw new Error(JSON.stringify(bad));
    expect(bad.contracts.map(c => c.status)).toEqual(["disproved", "unproved", "proved"]);
    expect(bad.counterexample?.before.balances["birch/primary"]).toBe("100");
    expect(bad.counterexample?.observed.balances["birch/primary"]).toBe("70");
    expect(bad.modelDisagreement).toBeUndefined();
    expect(bad.contracts[0]?.difference).toEqual({
      subject: "birch/primary balance (other tenant)", expected: "100 cents", received: "70 cents",
    });
    const failing = stripVTControlCharacters(format(bad));
    expect(failing).toContain("1 failed · 1 unproved · 1 proved");
    expect(failing).toContain("× Charge only the requested account");
    expect(failing).toContain("Expected  100 cents\n      Received  70 cents");
    expect(failing).not.toContain("==>");
    const verbose = stripVTControlCharacters(format(bad, { verbose: true }));
    expect(verbose).toContain(bad.contracts[0]!.claim);
    expect(verbose).toContain(bad.replay.engine);

    // Keep the original SQL but change what the author asks Pud to prove.
    await writeFile(file, original.replace(/^\/\/@ ensures debit .*$/m,
      '//@ ensures response "Decline a funded account": funded(account, amount) ==> result === "declined"'));
    const wrongReply = await check(file);
    if (wrongReply.status !== "disproved") throw new Error(JSON.stringify(wrongReply));
    expect(wrongReply.contracts[0]!.difference).toEqual({
      subject: "Returned status", expected: "declined", received: "applied",
    });
    const responseLog = stripVTControlCharacters(format(wrongReply));
    expect(responseLog).toContain("× Decline a funded account");
    expect(responseLog).toContain("Expected  declined\n      Received  applied");
    expect(responseLog).not.toContain("birch/primary balance");

    await writeFile(file, original.replace("SERIALIZABLE", "READ COMMITTED"));
    expect((await check(file)).status).toBe("unsupported");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 90_000);

test("the CLI verifies the edited handler and reports falsified contracts on real returns and commits", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-handler-edits-"));
  const file = join(dir, "handler.ts");
  const cli = Bun.fileURLToPath(new URL("cli.ts", example));
  async function run(source: string, exitCode: number) {
    await writeFile(file, source);
    const proc = Bun.spawn([process.execPath, cli, "check", file, "--json"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([
      new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
    ]);
    if (code !== exitCode) throw new Error(`Expected exit ${exitCode}, got ${code}\n${stdout}\n${stderr}`);
    return JSON.parse(stdout) as Report;
  }
  try {
    await writeFile(join(dir, "schema.sql"), schema);
    const renamed = original.replaceAll("CLAIM", "RESERVE_RECEIPT").replaceAll("claim.rows", "reservation.rows")
      .replace("const claim =", "const reservation =").replace("reservation.rows.length === 0", "!(reservation.rows.length !== 0)");
    expect((await run(renamed, 0)).status).toBe("proved");

    const committed = await run(original.replace('db.query("ROLLBACK")', 'db.query("COMMIT")'), 1);
    if (committed.status !== "disproved") throw new Error(JSON.stringify(committed));
    expect(committed.modelDisagreement).toBeUndefined();
    expect(committed.contracts.map(c => [c.name, c.status])).toEqual([
      ["debit", "proved"], ["decline", "disproved"], ["retry", "proved"],
    ]);
    expect(committed.contracts[1]!.difference).toEqual({ subject: "Receipt acme/order-2", expected: "absent", received: "recorded" });

    const beforeBegin = 'await db.query("BEGIN ISOLATION LEVEL SERIALIZABLE")';
    const early = await run(original.replace(beforeBegin, `if (amountCents === 30n) return;\n  ${beforeBegin}`), 1);
    if (early.status !== "disproved") throw new Error(JSON.stringify(early));
    expect(early.modelDisagreement).toBeUndefined();
    expect(early.contracts[0]!.difference).toEqual({ subject: "Returned status", expected: "applied", received: "undefined" });

    // The six samples all pass. The real early-return branch must still block a universal proof.
    const unsampled = await run(original.replace(beforeBegin, `if (amountCents === 7n) return "duplicate";\n  ${beforeBegin}`), 1);
    if (unsampled.status !== "unproved") throw new Error(JSON.stringify(unsampled));
    expect(unsampled.replay.checks).toHaveLength(6);
    expect(unsampled.contracts[0]!.status).toBe("unproved");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);
