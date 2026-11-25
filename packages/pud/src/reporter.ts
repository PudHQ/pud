import { dirname, relative, resolve } from "node:path";
import type { CheckProgress, CheckReport, CheckResult } from "./check.ts";
import { terminalProgress } from "./terminal-progress.ts";
import { pudBanner, terminalInk, verdictColor, verdictMark } from "./terminal.ts";

const badges = { proved: "PASS", disproved: "FAIL", unproved: "UNPROVED", unsupported: "UNSUPPORTED", error: "ERROR", todo: "TODO" } as const;
const summaryLabels = { proved: "passed", disproved: "failed", unproved: "unproved", unsupported: "unsupported", error: "errors", todo: "todo" };
type Counts = Record<CheckResult["status"], number>;

function target(result: CheckResult) {
  return result.name ?? result.subject;
}

function detail(result: CheckResult, verbose: boolean, ink: ReturnType<typeof terminalInk>) {
  if (result.counterexample?.difference) {
    const { summary, input, difference } = result.counterexample;
    return [
      summary,
      Object.entries(input).map(([key, value]) => `${key}=${value}`).join("  "),
      difference.subject,
      `  ${ink.green("Expected")}  ${difference.expected}`,
      `  ${ink.red("Received")}  ${difference.received}`,
    ].join("\n");
  }
  return verbose ? result.diagnostic ?? result.detail : result.detail;
}

function location(file: string, result: CheckResult) {
  return result.line ? `${file}:${result.line}` : file;
}

export function display(file: string, result: CheckResult, verbose: boolean, out: NodeJS.WriteStream) {
  const ink = terminalInk(out);
  const verdict = badges[result.status];
  const badge = verdictColor(ink, verdict).bold(verdict.padEnd(9));
  const name = target(result);
  out.write(`${badge}  ${name ? name + "  " : ""}${ink.dim(location(file, result))}\n`);
  const message = detail(result, verbose, ink);
  if (message) out.write(`   ${message.replaceAll("\n", "\n   ")}\n`);
}

function reportRows(results: readonly CheckResult[]) {
  const rows: { result: CheckResult; affected?: CheckResult[] }[] = [];
  const printed = new Set<CheckResult>();
  for (const result of results) {
    if (printed.has(result)) continue;
    if (result.subject && (result.status === "unsupported" || result.status === "error")) {
      const affected = results.filter(other => other.subject === result.subject && other.status === result.status && other.detail === result.detail);
      if (affected.length > 1) {
        rows.push({ result: { ...result, name: `${result.subject} (${affected.length} properties)`, line: undefined }, affected });
        for (const item of affected) printed.add(item);
        continue;
      }
    }
    rows.push({ result });
  }
  return rows;
}

function affectedLocation(file: string, result: CheckResult) {
  return `${target(result)}  ${location(file, result)}`;
}

function displayReport({ file, results }: CheckReport, verbose: boolean, out: NodeJS.WriteStream) {
  for (const { result, affected } of reportRows(results)) {
    display(file, result, verbose, out);
    if (verbose && affected) for (const item of affected) out.write(`   ${affectedLocation(file, item)}\n`);
  }
}

function width(out: NodeJS.WriteStream) {
  return Math.min(out.columns || 80, 96);
}

function writeLine(out: NodeJS.WriteStream, prefix: string, text: string, continuation?: string) {
  const indent = Bun.stringWidth(prefix);
  const wrapped = Bun.wrapAnsi(text, Math.max(1, width(out) - indent - 1), { hard: true, trim: false });
  out.write(`${prefix}${wrapped.replaceAll("\n", `\n${continuation ?? " ".repeat(indent)}`)}\n`);
}

function duration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function displayTerminalReport({ file, results }: CheckReport, verbose: boolean, out: NodeJS.WriteStream, root: string, elapsedMs: number) {
  const ink = terminalInk(out);
  const priority = ["error", "unsupported", "disproved", "unproved", "proved", "todo"] as const;
  const status = priority.find(status => results.some(result => result.status === status)) ?? "todo";
  const lead = `  ${verdictMark(ink, badges[status])} `;
  const label = ink.bold(relative(root, file));
  const time = ink.dim(duration(elapsedMs));
  const gap = Math.max(2, width(out) - 2 - Bun.stringWidth(lead + label + time));
  writeLine(out, lead, label + " ".repeat(gap) + time);

  const rows = reportRows(results);
  const margin = "          ";
  const edge = ink.dim(`${margin}│ `);
  const source = relative(process.cwd(), file);
  for (const [index, { result, affected }] of rows.entries()) {
    const branch = ink.dim(index === rows.length - 1 ? "    └─ " : "    ├─ ");
    const verdict = badges[result.status];
    const badge = verdictColor(ink, verdict).bold(verdict.padEnd(4));
    const line = result.line ? ink.dim(`  :${result.line}`) : "";
    writeLine(out, `${branch}${badge}  `, (target(result) ?? "") + line);
    const message = detail(result, verbose, ink);
    if (message) {
      const assistant = result.assistant;
      const diagnostic = assistant ? `${assistant[0]!.toUpperCase()}${assistant.slice(1)} diagnostic` : "Diagnostic";
      const heading = result.counterexample ? "Counterexample" : diagnostic;
      writeLine(out, margin, ink.bold(heading));
      out.write(`${margin}${ink.dim(location(source, result))}\n`);
      writeLine(out, edge, message, edge);
    }
    if (verbose && affected) for (const item of affected) writeLine(out, margin, affectedLocation(source, item));
  }
}

function displaySummary(counts: Counts, elapsedMs: number, out: NodeJS.WriteStream, fileCount?: string) {
  const statuses = (Object.keys(counts) as (keyof Counts)[]).filter(status => counts[status]);
  const label = (status: keyof Counts) => `${counts[status]} ${status === "error" && counts.error === 1 ? "error" : summaryLabels[status]}`;
  if (!fileCount) {
    out.write(`\n${statuses.map(label).join(" · ")}  ${(elapsedMs / 1000).toFixed(1)}s\n`);
    return;
  }
  const ink = terminalInk(out);
  const tally = statuses.map(status => verdictColor(ink, badges[status]).bold(label(status)));
  out.write(`\n  ${ink.dim("─".repeat(width(out) - 4))}\n`);
  writeLine(out, "  ", [...tally, ink.dim(fileCount), ink.dim(duration(elapsedMs))].join(ink.dim("  ·  ")));
}

export function proofReporter(files: readonly string[], started: number, verbose: boolean) {
  const progress = files.length ? terminalProgress(process.stderr, started) : undefined;
  const cwd = process.cwd();
  const directories = new Set(files.map(file => dirname(resolve(file))));
  const root = directories.size === 1 ? directories.values().next().value! : cwd;
  const fileCount = `${files.length} proof file${files.length === 1 ? "" : "s"}`;
  if (progress) {
    const out = process.stderr;
    const scope = relative(cwd, root);
    out.write(`\n${pudBanner(out, "Proof check")}\n`);
    writeLine(out, "   ", terminalInk(out).dim(scope ? `${fileCount}  ·  ${scope}` : fileCount));
    out.write("\n");
  }
  const times = new Map<string, number>();
  let active: { file: string; started: number } | undefined;
  return {
    update: progress && ((event: CheckProgress) => {
      if (event.kind === "suite" || event.kind === "validating") {
        const now = performance.now();
        if (active) times.set(active.file, now - active.started);
        active = event.kind === "suite" ? { file: event.file, started: now } : undefined;
      }
      progress.update(event);
    }),
    close: progress?.close,
    report(reports: readonly CheckReport[], counts: Counts, errors: readonly string[], out: NodeJS.WriteStream) {
      const rich = progress && (!out.columns || out.columns >= 28);
      for (const report of reports) {
        if (rich) displayTerminalReport(report, verbose, out, root, times.get(report.file) ?? 0);
        else displayReport(report, verbose, out);
      }
      for (const error of errors) out.write(error + "\n");
      if (reports.length) displaySummary(counts, performance.now() - started, out, rich ? fileCount : undefined);
    },
  };
}
