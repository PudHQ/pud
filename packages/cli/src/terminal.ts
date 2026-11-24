import chalk, { Chalk, chalkStderr, type ChalkInstance } from "chalk";

const monochrome = new Chalk({ level: 0 });

export function terminalInk(out: NodeJS.WriteStream): ChalkInstance {
  if (process.env.NO_COLOR) return monochrome;
  return out === process.stderr ? chalkStderr : chalk;
}

export function isInteractiveTerminal(out: NodeJS.WriteStream): boolean {
  return Boolean(out.isTTY && process.env.TERM !== "dumb");
}

const appearance = {
  PASS: { text: "green", background: "bgGreen", contrast: "black", mark: "✓" },
  FAIL: { text: "red", background: "bgRed", contrast: "white", mark: "×" },
  UNPROVED: { text: "yellow", background: "bgYellow", contrast: "black", mark: "?" },
  UNSUPPORTED: { text: "yellow", background: "bgYellow", contrast: "black", mark: "!" },
  ERROR: { text: "red", background: "bgRed", contrast: "white", mark: "!" },
  TODO: { text: "cyan", background: "bgCyan", contrast: "black", mark: "○" },
} as const;

export type Verdict = keyof typeof appearance;

export function verdictColor(ink: ChalkInstance, verdict: Verdict): ChalkInstance {
  return ink[appearance[verdict].text];
}

export function verdictBadge(ink: ChalkInstance, verdict: Verdict): string {
  const { background, contrast } = appearance[verdict];
  return ink[background][contrast].bold(` ${verdict} `);
}

export function verdictMark(ink: ChalkInstance, verdict: Verdict): string {
  return verdictColor(ink, verdict)(appearance[verdict].mark);
}

export function pudBanner(out: NodeJS.WriteStream, title: string): string {
  const ink = terminalInk(out);
  const brand = [
    ink.hex("#ff462d").bold("P"),
    ink.hex("#f381bd").bold("u"),
    ink.hex("#00bbd5").bold("d"),
  ].join("");
  return `🍮 ${brand} ${ink.dim("·")} ${title}`;
}
