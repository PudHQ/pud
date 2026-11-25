import type { ChalkInstance } from "chalk";
import { basename } from "node:path";
import type { CheckProgress, CheckResult } from "./check.ts";
import { isInteractiveTerminal, terminalInk, verdictColor } from "./terminal.ts";

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

type Completion = { status: CheckResult["status"] | undefined; proved: number; failed: number };

function alignRight(label: string, detail: string, columns: number) {
  if (!detail) return clip(label, columns);
  const available = columns - width(detail);
  const left = clip(label, available - 2);
  return left + " ".repeat(available - width(left)) + detail;
}

function proofTrail(ink: ChalkInstance, completed: readonly Completion[], total: number, active: boolean, columns: number) {
  if (!total) return "";
  const done = completed.length;
  const countWidth = width(`${total}/${total}`);
  const slots = Math.min(total, Math.max(1, Math.floor((columns - countWidth - 1) / 2)));
  const queued = ink.hex("#a1a1aa")(ink.level ? "•" : "·");
  const proved = verdictColor(ink, "PASS")("•");
  const failed = verdictColor(ink, "FAIL")(ink.level ? "•" : "×");
  const unknown = ink.dim(ink.level ? "•" : "○");
  const cursor = ink.cyan.bold("◆");

  const markers = Array.from({ length: slots }, (_, slot) => {
    const start = Math.floor(slot * total / slots);
    const end = Math.floor((slot + 1) * total / slots);
    if (end > done) return active && start <= done ? cursor : queued;
    const last = completed[end - 1]!;
    const previous = completed[start - 1];
    if (last.failed > (previous?.failed ?? 0)) return failed;
    return last.proved - (previous?.proved ?? 0) === end - start ? proved : unknown;
  });

  return `${markers.join(" ")}  ${ink.dim(`${done}/${total}`)}`;
}

/** The live trail shows provisional outcomes. The final report validates the snapshots. */
export function terminalProgress(out = process.stderr, runStarted = performance.now()) {
  if (!isInteractiveTerminal(process.stdout) || !isInteractiveTerminal(out) || (out.columns && out.columns < 28)) return;

  const ink = terminalInk(out);
  let suite: Extract<CheckProgress, { kind: "suite" }> | undefined;
  let written = 0, frame = 0, suiteItems = 0;
  let validating = false;
  const running = new Map<number, number>();
  const completed: Completion[] = [];
  const finished = new Map<number, number>();

  function draw() {
    if (!suite) return;
    const now = performance.now();
    const columns = (out.columns || 80) - 1;
    if (columns < 27) {
      if (written) out.write(erase(written));
      written = 0;
      return;
    }
    const spinner = frames[frame % frames.length]!;
    const active = validating ? undefined : running.entries().next().value;
    const item = active && suite.items[active[0]];
    const title = validating ? "Validating input snapshots" : item ? safeText(item.name)
      : finished.size < suiteItems ? "Preparing proofs" : "Finishing suite";
    const totalTime = ink.dim(`total ${seconds(now - runStarted)}`);
    const proofTime = active ? ink.dim(`proof ${seconds(now - active[1])}`) : "";
    const file = safeText(basename(suite.file));
    const batch = active && running.size > 1 ? `  ·  +${running.size - 1} running` : "";
    const lines = [
      alignRight(`  ${ink.cyan(spinner)}  ${ink.bold(title)}`, totalTime, columns),
      alignRight(`     ${ink.dim(file + batch)}`, proofTime, columns),
    ];
    const trail = proofTrail(ink, completed, suite.totalItems, !!item, columns - 2);
    if (trail) lines.push("", `  ${trail}`);
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
        suite = event;
        suiteItems = event.items.reduce((count, item) => count + Number(!item.todo), 0);
        finished.clear();
        running.clear();
        validating = false;
      } else if (event.kind === "validating") {
        validating = true;
      } else if (event.file === suite?.file) {
        if (event.kind === "running") {
          const active = running.entries().next().value;
          running.clear();
          const now = performance.now();
          for (const index of event.indices) {
            if (!finished.has(index)) running.set(index, index === active?.[0] ? active[1] : now);
          }
        } else {
          let firstChanged = completed.length;
          for (const [offset, index] of event.indices.entries()) {
            running.delete(index);
            const status = event.statuses?.[offset];
            const position = finished.get(index);
            if (position === undefined) {
              finished.set(index, completed.length);
              completed.push({ status, proved: 0, failed: 0 });
            } else if (status !== undefined && status !== completed[position]!.status) {
              completed[position]!.status = status;
              firstChanged = Math.min(firstChanged, position);
            }
          }
          // Prefix totals let each compressed dot classify its range in constant time.
          let proved = completed[firstChanged - 1]?.proved ?? 0;
          let failed = completed[firstChanged - 1]?.failed ?? 0;
          for (let index = firstChanged; index < completed.length; index++) {
            const result = completed[index]!;
            if (result.status === "proved") proved++;
            else if (result.status && result.status !== "todo") failed++;
            result.proved = proved;
            result.failed = failed;
          }
        }
      }
      if (!written || event.kind === "validating") draw();
    },
    close,
  };
}
