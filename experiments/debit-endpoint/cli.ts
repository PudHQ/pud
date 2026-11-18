#!/usr/bin/env bun
import { check, type Report } from "./lib.ts";

const usage = "Usage: pud check [handler.ts] [--json]";

export function format(report: Report): string {
  if (!("contracts" in report)) return `${report.status.toUpperCase()}  ${report.file}\n  ${report.message}`;
  const lines = report.contracts.map(c => `${c.status.toUpperCase().padEnd(9)} ${c.name}  ${report.file}:${c.line}`);
  if (report.status === "disproved") {
    const w = report.counterexample;
    lines.push("", `PostgreSQL counterexample: tenant ${w.tenantId}, account ${w.accountId}, request ${w.requestId}, debit ${w.amountCents} cents.`);
    lines.push(`  Returned ${w.observed.status}.`);
    for (const [account, balance] of Object.entries(w.before.balances)) {
      const after = w.observed.balances[account];
      if (after !== balance) {
        const outside = account.startsWith(w.tenantId + "/") ? "" : " (other tenant)";
        lines.push(`  ${account}: ${balance} → ${after} cents${outside}`);
      }
    }
    for (const c of report.contracts.filter(c => c.status === "disproved")) lines.push(`  Violated: ${c.claim}`);
    if (report.modelDisagreement) lines.push("  The formal model and PostgreSQL disagree for this claim.");
  } else {
    lines.push(`\nSerializable transaction checked. Replayed ${report.replay.checks.length} HTTP requests on ${report.replay.engine}.`);
  }
  return lines.join("\n");
}

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  const files = args.filter(a => a !== "--json");
  if (command === "--help" || (command === "check" && args.includes("--help"))) {
    console.log(usage);
  } else if (command !== "check" || files.length > 1 || files.some(f => f.startsWith("-"))) {
    console.error(usage);
    process.exitCode = 2;
  } else {
    const report = await check(files[0]);
    console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : format(report));
    process.exitCode = report.status === "proved" ? 0 : report.status === "error" || report.status === "unsupported" ? 2 : 1;
  }
}
