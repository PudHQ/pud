import { expect, test } from "bun:test";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, checkFiles, type CheckReport } from "../src/check.ts";

const example = new URL("../../../experiments/debit-endpoint/", import.meta.url);

test("a migration edit invalidates only the properties that used its snapshot", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-schema-edit-"));
  try {
    const file = join(dir, "debit.proof.ts"), schema = join(dir, "schema.sql");
    for (const name of ["handler.ts", "schema.sql", "debit.proof.ts"]) await copyFile(new URL(name, example), join(dir, name));
    await writeFile(join(dir, "ledger.ts"), `export * from ${JSON.stringify(new URL("ledger.ts", example).href)};`);
    const migration = await readFile(schema, "utf8"), edited = migration.replace("CHECK (balance >= 0)", "");
    expect(edited).not.toBe(migration);
    const control = join(dir, "control.proof.ts"), editor = join(dir, "save.proof.ts");
    await writeFile(join(dir, "ready.ts"), "export function ready(): boolean { return true; }");
    const claim = 'export default { subject: ready, property: (result) => result };';
    const target = 'import { ready } from "./ready.ts";';
    await writeFile(control, target + claim);
    await writeFile(editor, target + 'export { editor as adapter } from "./editor.ts";' + claim);
    await writeFile(join(dir, "editor.ts"), `import { writeFileSync } from "node:fs";
      export const editor = {
        backend: { emit() {}, verify() { throw Error("unused"); } },
        prepare() { writeFileSync(${JSON.stringify(schema)}, ${JSON.stringify(edited)}); throw Error("saved"); },
      };`);

    const [debit, saved, independent] = await checkFiles([file, editor, control]);
    expect(saved!.results[0]?.detail).toBe("saved");
    expect(debit!.results.map(r => r.status)).toEqual(["error", "error", "error"]);
    for (const result of debit!.results) expect(result.detail).toContain("schema.sql changed during verification");
    expect(independent!.results[0]?.status).toBe("proved");
    expect((await check(file)).results.map(r => r.status)).toEqual(["unsupported", "unsupported", "unsupported"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 120_000);

test("two different exported handlers share a ledger adapter, including actual database counterexamples", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-ledger-model-"));
  const file = join(dir, "requests.proof.ts"), source = join(dir, "requests.ts");
  try {
    const original = await readFile(new URL("handler.ts", example), "utf8");
    const sidecar = await readFile(new URL("debit.proof.ts", example), "utf8");
    await copyFile(new URL("schema.sql", example), join(dir, "schema.sql"));
    await writeFile(join(dir, "ledger.ts"), `export * from ${JSON.stringify(new URL("ledger.ts", example).href)};`);

    // A separate endpoint only probes whether it could claim a request. Its transaction must leave no writes.
    const probe = `export async function probe(session: Session, auth: Auth, input: DebitInput): Promise<"declined"> {
      await session.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      await session.query(CLAIM, [auth.tenantId, input.requestId]);
      await session.query("ROLLBACK");
      return "declined";
    }`;
    const handlers = original.replace("function debit(", "function charge(") + "\n" + probe;
    const review = sidecar.replace('import { debit } from "./handler.ts"', 'import { charge as debit, probe } from "./requests.ts"')
      .replace("export default [", 'export default [\n { subject: probe, name: "A probe leaves the ledger untouched", property: (tx: DebitObservation) => tx.unchanged },');
    await writeFile(file, review);
    await writeFile(source, handlers);
    expect((await check(file)).results.map(r => [r.subject, r.status])).toEqual([
      ["probe", "proved"], ["charge", "proved"], ["charge", "proved"], ["charge", "proved"],
    ]);
    const direct = handlers.replace(/UPDATE accounts AS a[\s\S]*?RETURNING a\.account_id/, `UPDATE accounts SET balance = balance - $3
      WHERE tenant_id = $1 AND account_id = $2 AND balance >= $3 RETURNING account_id`);
    await writeFile(source, direct);
    expect((await check(file)).results.map(r => r.status)).toEqual(["proved", "proved", "proved", "proved"]);

    await writeFile(source, handlers.replace('session.query("ROLLBACK")', 'session.query("COMMIT")')
      .replace("a.tenant_id = r.tenant_id AND ", ""));
    const cli = Bun.fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const run = Bun.spawn([process.execPath, cli, "check", file, "--json"], { stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(run.stdout).text(), new Response(run.stderr).text(), run.exited]);
    expect(stderr).toBe("");
    expect(code).toBe(1);
    const report = JSON.parse(stdout) as { files: CheckReport[] };
    const broken = report.files[0]!.results;
    expect(broken.map(r => r.status)).toEqual(["disproved", "disproved", "disproved", "proved"]);
    expect(broken[0]?.detail).toContain("Receipt acme/order-1");
    expect(broken[1]?.detail).toContain("birch/primary balance (other tenant)");
    expect(broken[1]?.detail).toContain("Received  70 cents");
    expect(broken[1]?.counterexample).toMatchObject({
      input: { tenantId: "acme", amountCents: "30" }, result: "applied",
      difference: { expected: "100 cents", received: "70 cents" },
    });
    expect(broken[2]?.counterexample).toMatchObject({
      input: { tenantId: "acme", accountId: "savings", requestId: "order-3" }, result: "applied",
      difference: { subject: "Returned status", expected: "declined", received: "applied" },
    });
    expect(await readFile(file, "utf8")).toBe(review);

    await writeFile(source, handlers);
    await writeFile(file, review.replace('tx.result === "applied"', 'tx.result === "declined"'));
    const specChange = (await check(file)).results;
    expect(specChange.map(r => r.status)).toEqual(["proved", "disproved", "proved", "proved"]);
    expect(specChange[1]!.detail).toContain("Received  applied");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 240_000);
