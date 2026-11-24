#!/usr/bin/env bun
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { display, displayReport, displaySummary } from "./reporter.ts";
import { checkFiles, emit } from "./check.ts";
import { isInteractiveTerminal, pudBanner } from "./terminal.ts";

const synopsis = `Usage: pud [check] [DIR | FILE.proof.ts ...] [--verbose | --json]
       pud --emit FILE.proof.ts [SUBJECT[.PROPERTY]]`;
const usage = `${synopsis}

With no paths, Pud discovers *.proof.ts under the current directory.
--emit     Print the verification unit for one property without running the prover or replay.
--verbose  Show reviewed properties and full diagnostics.
--json     Print machine-readable results.
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
    catch (e) { display(args[1]!, { status: "error", detail: (e as Error).message }, false, process.stderr); return 2; }
  }
  const started = performance.now();
  const verbose = args.includes("--verbose"), json = args.includes("--json");
  const paths = args.filter(a => a !== "--verbose" && a !== "--json");
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
  const reports = await checkFiles([...files.values()]);
  const counts = { proved: 0, disproved: 0, unproved: 0, unsupported: 0, error: errors.length, todo: 0 };
  for (const report of reports) for (const r of report.results) counts[r.status]++;
  const code = counts.error || counts.unsupported ? 2 : counts.disproved || counts.unproved ? 1 : 0;
  if (json) console.log(JSON.stringify({ files: reports, counts, ...(errors.length ? { errors } : {}) }, null, 2));
  else {
    const out = code ? process.stderr : process.stdout;
    if (reports.length && isInteractiveTerminal(out)) out.write(`\n${pudBanner(out, "Proof check")}\n\n`);
    for (const report of reports) displayReport(report, verbose, out);
    for (const error of errors) out.write(error + "\n");
    if (reports.length) displaySummary(counts, performance.now() - started, out);
  }
  return code;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
