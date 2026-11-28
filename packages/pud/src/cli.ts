#!/usr/bin/env bun
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { failure } from "./assistant.ts";
import { checkFiles, emit } from "./run.ts";
import { display, proofReporter } from "./reporter.ts";

const synopsis = `Usage: pud.dev [check] [DIR | FILE.proof.ts ...] [--verbose | --json] [--deny-cases]
       pud.dev --emit FILE.proof.ts [PROPERTY | SUBJECT[.PROPERTY]]`;
const usage = `${synopsis}

With no paths, Pud discovers *.proof.ts under the current directory.
The nearest pud.config.ts selects the proof assistant.
--emit     Print the verification unit for one property without running the prover or replay.
--verbose  Show full diagnostics and affected properties.
--json     Print machine-readable results.
--deny-cases  Fail on zero-input claims or explicit literal constraints on every input. Quantified postconditions are allowed.
Exit: 0 all active properties proved, 1 unproved or disproved, 2 unsupported, invalid input or tool error.`;

const skipped = new Set(["node_modules", "dist", "out", "build", "coverage"]);
function discover(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith(".") || skipped.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return discover(path);
    return (entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith(".proof.ts") ? [path] : [];
  }).sort();
}

async function main(args: string[]): Promise<number> {
  if (args[0] === "check") args = args.slice(1);
  if (args.length === 1 && ["--help", "-h"].includes(args[0]!)) { console.log(usage); return 0; }
  if (args[0] === "--emit" && args.length >= 2 && args.length <= 3 && !args.includes("--json")) {
    try { process.stdout.write(await emit(args[1]!, args[2])); return 0; }
    catch (error) {
      display(args[1]!, failure(error), false, process.stderr);
      return 2;
    }
  }
  const started = performance.now();
  const verbose = args.includes("--verbose"), json = args.includes("--json");
  const denyCases = args.includes("--deny-cases");
  const paths = args.filter(a => a !== "--verbose" && a !== "--json" && a !== "--deny-cases");
  const files = new Map<string, string>(), errors: string[] = [];
  if (paths.some(path => path.startsWith("-")) || (json && verbose)) errors.push(synopsis);
  else for (const path of paths.length ? paths : ["."]) {
    try {
      if (statSync(path, { throwIfNoEntry: false })?.isDirectory()) {
        const matches = discover(path);
        if (!matches.length) errors.push(`No *.proof.ts files found in ${path}. Add a proof file beside the function you want to check.`);
        for (const file of matches) files.set(resolve(file), file);
      } else if (path.endsWith(".proof.ts")) files.set(resolve(path), path);
      else errors.push(`Expected a directory or a *.proof.ts file. Received ${path}.`);
    } catch (e) { errors.push((e as Error).message); }
  }
  const selected = [...files.values()];
  const reporter = json ? undefined : proofReporter(selected, started, verbose);
  const reports = await checkFiles(selected, { onProgress: reporter?.update }).finally(reporter?.close);
  if (denyCases) for (const report of reports) for (const result of report.results) {
    if (result.concreteScope) errors.push(`${report.file}:${result.line}: "${result.name}" has ${result.concreteScope === "no-inputs" ? "no inputs" : "a literal constraint on every input"}. State a law over a domain or move the case to a runtime test.`);
  }
  const counts = { proved: 0, disproved: 0, unproved: 0, unsupported: 0, error: errors.length, todo: 0 };
  for (const report of reports) for (const r of report.results) counts[r.status]++;
  const code = counts.error || counts.unsupported ? 2 : counts.disproved || counts.unproved ? 1 : 0;
  if (json) console.log(JSON.stringify({ files: reports, counts, ...(errors.length ? { errors } : {}) }, null, 2));
  else reporter?.report(reports, counts, errors, code ? process.stderr : process.stdout);
  return code;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
