import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { check, emit } from "@pud/cli";
import { leanAdapter } from "@pud/cli/lean";
import { leanReporter, type LeanResult } from "./reporter.ts";

const examples = fileURLToPath(new URL("./.examples/", import.meta.url));
const usage = `Usage: bun run demo:lean [FILE.proof.ts ...]
       bun run demo:lean --emit FILE.proof.ts [PROPERTY]

With no files, check every Lean example.
--emit     Print the generated Lean for one property.
--help     Show this help.`;

async function main(args: string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(usage);
    return 0;
  }
  const toolchain = readFileSync(new URL("./lean-toolchain", import.meta.url), "utf8").trim();
  const adapter = leanAdapter({ toolchain });
  if (args[0] === "--emit") {
    const [, file, property] = args;
    if (!file || args.length > 3) throw new Error(usage);
    process.stdout.write(await emit(file, { adapter, property }));
    return 0;
  }
  if (args.some(arg => arg.startsWith("-"))) throw new Error(usage);
  const files = args.length ? args : readdirSync(examples).filter(file => file.endsWith(".proof.ts")).sort().map(file => join(examples, file));
  const reporter = leanReporter(files);
  for (const file of files) {
    const started = performance.now();
    const { results } = await check(file, { adapter });
    const checks: LeanResult[] = [];
    for (const result of results) {
      if (!result.name || !result.line) {
        reporter.error(file, result.detail ?? "Unable to read the proof suite.");
        continue;
      }
      checks.push({ name: result.name, line: result.line, diagnostic: result.diagnostic ?? result.detail,
        status: result.status === "proved" ? "PASS" : result.status === "todo" ? "TODO" : "FAIL" });
    }
    if (checks.length) reporter.report(file, checks, performance.now() - started);
  }
  return reporter.finish();
}

if (import.meta.main) {
  try { process.exitCode = await main(process.argv.slice(2)); }
  catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
