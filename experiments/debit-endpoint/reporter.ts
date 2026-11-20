import { Chalk } from "chalk";
import type { ContractResult, Report } from "./lib.ts";

export const ink = new Chalk({ level: process.env.NO_COLOR === undefined ? undefined : 0 });

export function banner(subject: string): string {
  return `🍮 ${ink.bold("pud")}  ${subject}`;
}

const badges = {
  proved: ink.bgGreen.black.bold(" PASS "),
  disproved: ink.bgRed.white.bold(" FAIL "),
  unproved: ink.bgYellow.black.bold(" UNPROVED "),
  unsupported: ink.bgYellow.black.bold(" UNSUPPORTED "),
  error: ink.bgRed.white.bold(" ERROR "),
};

const marks = { proved: ink.green("✓"), disproved: ink.red("×"), unproved: ink.yellow("?") };
const verdicts = [["disproved", "failed"], ["unproved", "unproved"], ["proved", "proved"]] as const;

function tally(contracts: ContractResult[]): string {
  return verdicts.flatMap(([status, label]) => {
    const count = contracts.filter(c => c.status === status).length;
    return count ? [`${count} ${label}`] : [];
  }).join(" · ");
}

export function format(report: Report, { elapsedMs, verbose = false }: { elapsedMs?: number; verbose?: boolean } = {}): string {
  const head = [badges[report.status], ink.bold(report.file)];
  if ("contracts" in report) head.push(tally(report.contracts));
  if (elapsedMs !== undefined) head.push(ink.dim(`${(elapsedMs / 1000).toFixed(1)}s`));
  const lines = [head.join("  ")];
  if (!("contracts" in report)) return [...lines, ...report.message.split("\n").map(line => "  " + line)].join("\n");

  for (const c of report.contracts) {
    const name = c.title ?? c.name;
    const state = c.status === "unproved" ? ink.yellow("  (inconclusive)") : "";
    const source = c.status !== "proved" || verbose ? ink.dim(`  ${report.file}:${c.line}`) : "";
    lines.push(`  ${marks[c.status]} ${name}${state}${source}`);
    if (verbose) lines.push(ink.dim(`    ${c.claim}`));
  }

  if (report.status === "disproved") {
    const { http, scenario } = report.counterexample;
    if (http) {
      const fields = Object.entries(http.input).map(([name, value]) => `${name}=${value}`);
      lines.push("", `  ${ink.bold("HTTP replay")}  ${http.method} ${http.path} → ${http.status} ${http.result}`, `    ${fields.join("  ")}`);
    } else {
      lines.push("", `  Replay  ${scenario}`);
    }
    const failed = report.contracts.filter(c => c.status === "disproved");
    for (const c of failed) {
      if (failed.length > 1) lines.push(`    ${ink.bold(c.title ?? c.name)}`);
      if (c.difference) {
        const { subject, expected, received } = c.difference;
        lines.push(`    ${subject}`, `      ${ink.green("Expected")}  ${expected}`, `      ${ink.red("Received")}  ${received}`);
      } else {
        lines.push(`    ${c.claim}`);
      }
    }
    if (report.modelDisagreement) lines.push(ink.red("  The proof model and the replay disagree on the failing contract."));
  } else {
    const n = report.replay.checks.length;
    lines.push(`  ${ink.dim(`${n} HTTP replay${n === 1 ? "" : "s"} passed · ${report.replay.engine}`)}`);
  }
  if (verbose) {
    lines.push("", `  Replays on ${report.replay.engine}`);
    for (const scenario of report.replay.checks) lines.push(`    ${marks.proved} ${scenario}`);
    if (report.status === "disproved") lines.push(`    ${marks.disproved} ${report.counterexample.scenario}`);
  }
  return lines.join("\n");
}
