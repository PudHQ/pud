import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { CheckReport, CheckResult } from "@pud/cli";
import { displayReport, displaySummary } from "../../packages/cli/src/reporter.ts";

const cli = Bun.fileURLToPath(new URL("../../packages/cli/src/cli.ts", import.meta.url));

function run(title: string, file: string) {
  console.log(title);
  const start = performance.now();
  const run = Bun.spawnSync([process.execPath, cli, "check", file, "--json"], { stdout: "pipe", stderr: "inherit" });
  const { files, counts }: { files: CheckReport[]; counts: Record<CheckResult["status"], number> } = JSON.parse(run.stdout.toString());
  const report = files[0]!;
  displayReport({ ...report, file: basename(file) }, false, process.stdout);
  displaySummary(counts, performance.now() - start, process.stdout);
  return { code: run.exitCode, report };
}

async function demo(dir: string): Promise<number> {
  const handler = join(dir, "handler.ts"), file = join(dir, "debit.proof.ts");
  const original = await readFile(new URL("./handler.ts", import.meta.url), "utf8");
  await copyFile(new URL("./schema.sql", import.meta.url), join(dir, "schema.sql"));
  await copyFile(new URL("./debit.proof.ts", import.meta.url), file);
  await writeFile(join(dir, "ledger.ts"), `export * from ${JSON.stringify(new URL("./ledger.ts", import.meta.url).href)};\n`);

  await writeFile(handler, original);
  const baseline = run("Original handler", file);
  if (baseline.code !== 0) return baseline.code ?? 2;

  const changed = original.replace(/\ba\.tenant_id\s*=\s*r\.tenant_id\s+AND\b\s*/i, "");
  if (changed === original) { console.error("The demo could not locate the tenant filter to remove."); return 2; }
  await writeFile(handler, changed);
  const edited = run("\nAfter removing the SQL tenant filter", file);
  if (edited.code === 1 && edited.report.results.some(r => r.status === "disproved" && r.counterexample)) return 0;
  console.error("Expected removing the tenant filter to produce a counterexample.");
  return edited.code === 2 ? 2 : 1;
}

const dir = await mkdtemp(join(tmpdir(), "pud-debit-demo-"));
try {
  process.exitCode = await demo(dir);
} finally {
  await rm(dir, { recursive: true, force: true });
}
