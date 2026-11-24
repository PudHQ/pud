import type { CheckReport, CheckResult } from "./check.ts";
import { terminalInk, verdictColor } from "./terminal.ts";

export function display(file: string, r: CheckResult, verbose: boolean, out: NodeJS.WriteStream) {
  const writer = (line: string) => out.write(line + "\n");
  const ink = terminalInk(out);
  const badges = { proved: "PASS", disproved: "FAIL", unproved: "UNPROVED", unsupported: "UNSUPPORTED", error: "ERROR" } as const;
  const verdict = badges[r.status];
  const badge = verdictColor(ink, verdict).bold(verdict.padEnd(9));
  const target = r.name ?? (r.spec ? `${r.subject} vs ${r.spec}` : r.subject);
  const where = ink.dim(r.line ? `${file}:${r.line}` : file);
  writer(`${badge}  ${target ? target + "  " : ""}${where}`);
  if (r.property && (verbose || r.status === "unproved")) writer(`   ${r.property}`);
  if (r.counterexample?.difference) {
    const { summary, input, difference } = r.counterexample;
    writer(`   ${summary}\n   ${Object.entries(input).map(([key, value]) => `${key}=${value}`).join("  ")}`);
    writer(`   ${difference.subject}\n     ${ink.green("Expected")}  ${difference.expected}\n     ${ink.red("Received")}  ${difference.received}`);
    return;
  }
  const detail = verbose ? r.diagnostic ?? r.detail : r.detail;
  if (detail) writer("   " + detail.replaceAll("\n", "\n   "));
}

export function displayReport({ file, results }: CheckReport, verbose: boolean, out: NodeJS.WriteStream) {
  const printed = new Set<CheckResult>();
  for (const r of results) {
    if (printed.has(r)) continue;
    if (r.subject && (r.status === "unsupported" || r.status === "error")) {
      const affected = results.filter(other => other.subject === r.subject && other.status === r.status && other.detail === r.detail);
      if (affected.length > 1) {
        display(file, { ...r, name: `${r.subject} (${affected.length} properties)`, line: undefined, property: undefined }, verbose, out);
        for (const item of affected) {
          printed.add(item);
          if (verbose) out.write(`   ${item.name ?? item.property ?? item.spec ?? item.subject}  ${item.line ? `${file}:${item.line}` : file}\n`);
        }
        continue;
      }
    }
    display(file, r, verbose, out);
  }
}

export function displaySummary(counts: Record<CheckResult["status"], number>, elapsedMs: number, out: NodeJS.WriteStream) {
  const labels = { proved: "passed", disproved: "failed", unproved: "unproved", unsupported: "unsupported", error: "errors" };
  const tally = (Object.keys(counts) as (keyof typeof counts)[]).filter(k => counts[k]).map(k => `${counts[k]} ${labels[k]}`);
  out.write(`\n${tally.join(" · ")}  ${(elapsedMs / 1000).toFixed(1)}s\n`);
}
