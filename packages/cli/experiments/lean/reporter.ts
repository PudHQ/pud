import { dirname, relative, resolve } from "node:path";
import { isInteractiveTerminal, pudBanner, terminalInk, verdictBadge, verdictColor, verdictMark } from "../../src/terminal.ts";

export interface LeanResult {
  status: "PASS" | "FAIL" | "TODO";
  name: string;
  line: number;
  diagnostic?: string;
}

function interactive(out: NodeJS.WriteStream): boolean {
  return isInteractiveTerminal(out) && (!out.columns || out.columns >= 28);
}

function width(out: NodeJS.WriteStream) { return Math.min(out.columns || 80, 96); }

function duration(ms: number) {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function line(out: NodeJS.WriteStream, prefix: string, text: string, continuation?: string) {
  const offset = Bun.stringWidth(prefix);
  const wrapped = Bun.wrapAnsi(text, Math.max(1, width(out) - offset), { hard: true, trim: false });
  const hanging = continuation ?? " ".repeat(offset);
  out.write(`${prefix}${wrapped.replaceAll("\n", `\n${hanging}`)}\n`);
}

function detail(out: NodeJS.WriteStream, text: string, margin: string, showTree: boolean) {
  if (showTree) {
    const edge = terminalInk(out).dim(`${margin}│ `);
    line(out, edge, text, edge);
  } else {
    out.write(`${margin}${text.replaceAll("\n", `\n${margin}`)}\n`);
  }
}

export function leanReporter(files: readonly string[]) {
  const started = performance.now();
  const totals = { PASS: 0, FAIL: 0, TODO: 0, ERROR: 0 };
  const cwd = process.cwd();
  const directories = new Set(files.map(file => dirname(resolve(file))));
  const root = directories.size === 1 ? directories.values().next().value! : cwd;
  const fileCount = `${files.length} proof file${files.length === 1 ? "" : "s"}`;

  if (interactive(process.stdout)) {
    const ink = terminalInk(process.stdout);
    const directory = relative(cwd, root);
    process.stdout.write(`\n${pudBanner(process.stdout, "Lean proofs")}\n`);
    line(process.stdout, "   ", ink.dim(directory ? `${fileCount}  ·  ${directory}` : fileCount));
    process.stdout.write("\n");
  }

  return {
    report(file: string, results: readonly LeanResult[], elapsedMs: number) {
      for (const item of results) totals[item.status]++;
      const failed = results.some(item => item.status === "FAIL");
      const out = failed ? process.stderr : process.stdout;
      const location = relative(cwd, file);

      if (!interactive(out)) {
        for (const item of results) {
          const stream = item.status === "FAIL" ? process.stderr : process.stdout;
          const ink = terminalInk(stream);
          const badge = verdictColor(ink, item.status).bold(item.status.padEnd(5));
          stream.write(`${badge} ${item.name}  ${location}:${item.line}\n`);
          if (item.diagnostic) detail(stream, item.diagnostic, "  ", false);
        }
        return;
      }

      const ink = terminalInk(out);
      const verdict = failed ? "FAIL" : results.some(item => item.status === "PASS") ? "PASS" : "TODO";
      const lead = `  ${verdictMark(ink, verdict)} `;
      const label = ink.bold(relative(root, resolve(file)));
      const elapsed = ink.dim(duration(elapsedMs));
      const gap = Math.max(2, width(out) - 2 - Bun.stringWidth(lead + label + elapsed));
      line(out, lead, label + " ".repeat(gap) + elapsed);
      for (const [index, item] of results.entries()) {
        const branch = ink.dim(index === results.length - 1 ? "    └─ " : "    ├─ ");
        const badge = verdictColor(ink, item.status).bold(item.status.padEnd(4));
        line(out, `${branch}${badge}  `, `${item.name}${ink.dim(`  :${item.line}`)}`);
        if (item.diagnostic) {
          const source = `${location}:${item.line}`;
          const inset = Math.min(10, Math.max(0, width(out) - Bun.stringWidth(source)));
          line(out, "          ", ink.red.bold("Lean diagnostic"));
          out.write(`${" ".repeat(inset)}${ink.dim(source)}\n`);
          detail(out, item.diagnostic, "          ", true);
        }
      }
    },
    error(file: string, diagnostic: string) {
      totals.ERROR++;
      const out = process.stderr;
      const ink = terminalInk(out);
      const location = relative(cwd, file);
      const rich = interactive(out);
      if (rich) line(out, `  ${verdictBadge(ink, "ERROR")}  `, ink.bold(location));
      else out.write(`${verdictColor(ink, "ERROR").bold("ERROR")} ${location}\n`);
      detail(out, diagnostic, rich ? "    " : "  ", rich);
    },
    finish() {
      const failed = totals.FAIL > 0 || totals.ERROR > 0;
      const out = failed ? process.stderr : process.stdout;
      const ink = terminalInk(out);
      const rich = interactive(out);
      const counts = [
        totals.PASS && verdictColor(ink, "PASS").bold(`${totals.PASS} passed`),
        totals.FAIL && verdictColor(ink, "FAIL").bold(`${totals.FAIL} failed`),
        totals.ERROR && verdictColor(ink, "ERROR").bold(`${totals.ERROR} ${totals.ERROR === 1 ? "error" : "errors"}`),
        totals.TODO && verdictColor(ink, "TODO").bold(`${totals.TODO} todo`),
      ].filter(Boolean);
      const separator = rich ? ink.dim("  ·  ") : " | ";
      const tally = [...counts, ink.dim(fileCount), ink.dim(duration(performance.now() - started))].join(separator);
      if (rich) {
        out.write(`\n  ${ink.dim("─".repeat(width(out) - 4))}\n`);
        line(out, "  ", tally);
      } else {
        out.write(`\n${tally}\n`);
      }
      return failed ? 1 : 0;
    },
  };
}
