import { basename } from "node:path";
import type { CheckProgress } from "./check.ts";
import { isInteractiveTerminal, terminalInk } from "./terminal.ts";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const erase = (lines: number) => lines ? `\x1b[${lines}F\x1b[J` : "";
const width = (text: string) => Bun.stringWidth(text);
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function clip(text: string, columns: number) {
  if (columns < 1) return "";
  return width(text) <= columns ? text : Bun.sliceAnsi(text, 0, columns - 1) + "…";
}

function safeText(text: string) {
  return text.replace(/\p{Cc}/gu, " ").trim();
}

/** A transient pane. Its checked items are progress, never provisional verdicts. */
export function terminalProgress(out = process.stderr) {
  if (!isInteractiveTerminal(process.stdout) || !isInteractiveTerminal(out) || (out.columns && out.columns < 28)) return;

  const ink = terminalInk(out);
  let suite: Extract<CheckProgress, { kind: "suite" }> | undefined;
  let written = 0, frame = 0, started = 0;
  let completed = 0;
  let validating = false;
  const running = new Map<number, number>();
  const finished = new Set<number>();

  function draw() {
    if (!suite) return;
    const now = performance.now();
    const columns = Math.max(12, Math.min(96, (out.columns || 80) - 1));
    const spinner = frames[frame % frames.length]!;
    const lines = [];
    if (validating) {
      lines.push(`  ${ink.cyan(spinner)}  Validating input snapshots`);
    } else {
      const index = ink.dim(`${suite.index + 1}/${suite.total}`);
      lines.push(`  ${index}  ${ink.bold(safeText(basename(suite.file)))}`);
      const available = Math.max(1, Math.min(5, (out.rows || 24) - 6));
      const active = running.keys().next().value ?? suite.items.findIndex((item, i) => !item.todo && !finished.has(i));
      const first = Math.max(0, Math.min(active, suite.items.length - available));
      for (let i = first; i < Math.min(first + available, suite.items.length); i++) {
        const item = suite.items[i]!;
        const since = running.get(i);
        const marker = item.todo ? ink.dim("○") : since !== undefined ? ink.cyan(spinner) : ink.dim(finished.has(i) ? "•" : "·");
        const status = item.todo ? "todo" : since !== undefined ? `checking ${seconds(now - since)}` : finished.has(i) ? "checked" : "queued";
        const name = clip(safeText(item.name), columns - 7 - width(status));
        const gap = Math.max(1, columns - 6 - width(name) - width(status));
        lines.push(`  ${marker}  ${since !== undefined ? ink.bold(name) : name}${" ".repeat(gap)}${ink.dim(status)}`);
      }
      lines.push(`  ${ink.dim(`${completed + finished.size}/${suite.totalItems} checked · ${seconds(now - started)}`)}`);
    }
    const barWidth = columns - 2;
    const filled = suite.totalItems ? Math.floor(barWidth * (completed + finished.size) / suite.totalItems) : 0;
    lines.push("  " + ink.white("▁".repeat(filled)) + ink.gray((ink.level ? "▁" : " ").repeat(barWidth - filled)));
    out.write(erase(written) + lines.map(line => clip(line, columns)).join("\n") + "\n");
    written = lines.length;
  }

  const timer = setInterval(() => { frame++; draw(); }, 90);
  timer.unref();
  function clear() {
    if (written) out.write(erase(written));
    written = 0;
    suite = undefined;
  }
  function close() {
    clearInterval(timer);
    clear();
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
  function interrupt(signal: NodeJS.Signals) {
    close();
    process.kill(process.pid, signal);
  }
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  return {
    update(event: CheckProgress) {
      if (event.kind === "suite") {
        completed += finished.size;
        suite = event;
        started = performance.now();
        finished.clear();
        running.clear();
        validating = false;
      } else if (event.kind === "validating") {
        validating = true;
      } else if (event.file === suite?.file) {
        if (event.kind === "running") {
          running.clear();
          const now = performance.now();
          for (const index of event.indices) if (!finished.has(index)) running.set(index, now);
        } else {
          for (const index of event.indices) {
            running.delete(index);
            finished.add(index);
          }
        }
      }
      draw();
    },
    close,
  };
}
