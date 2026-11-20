#!/usr/bin/env bun
import { check } from "./lib.ts";
import { banner, format } from "./reporter.ts";

export { format };

const usage = `Usage: pud check [handler.ts] [--verbose | --json]

  --verbose  Show the contract expressions and individual database replays.
  --json     Print the report for tools and CI.`;

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  const files = args.filter(a => a !== "--json" && a !== "--verbose");
  const json = args.includes("--json"), verbose = args.includes("--verbose");
  if (command === "--help" || (command === "check" && args.includes("--help"))) {
    console.log(usage);
  } else if (command !== "check" || files.length > 1 || files.some(f => f.startsWith("-")) || (json && verbose)) {
    console.error(usage);
    process.exitCode = 2;
  } else {
    if (!json) console.log(banner("check") + "\n");
    const start = performance.now();
    const report = await check(files[0]);
    console.log(json ? JSON.stringify(report, null, 2) : format(report, { elapsedMs: performance.now() - start, verbose }));
    process.exitCode = report.status === "proved" ? 0 : report.status === "error" || report.status === "unsupported" ? 2 : 1;
  }
}
