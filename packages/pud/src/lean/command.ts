import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { SubjectSource } from "../assistant.ts";

export interface LeanOptions {
  executable?: string;
  toolchain?: string;
  replay?: boolean;
}

function ancestors(file: string) {
  const directories: string[] = [];
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    directories.push(dir);
    if (dirname(dir) === dir) return directories;
  }
}

export function leanCommand(subject: SubjectSource, options: LeanOptions) {
  const directories = ancestors(subject.file);
  const executable = process.platform === "win32" ? "lean.exe" : "lean";
  const override = options.executable ?? process.env.PUD_LEAN;
  const local = [...directories, ...ancestors(join(process.cwd(), "pud.config.ts"))]
    .map(dir => join(dir, ".cache", "elan")).find(home => Bun.which(join(home, "bin", executable)));
  const localShim = local && join(local, "bin", executable);
  const userShim = join(process.env.ELAN_HOME ?? join(homedir(), ".elan"), "bin", executable);
  const binary = override
    ? /[/\\]/.test(override) ? resolve(override) : Bun.which(override) ?? override
    : localShim ?? Bun.which("lean") ?? Bun.which(userShim) ?? "lean";
  const env = { ...process.env };
  if (local && binary === localShim) env.ELAN_HOME = local;
  let toolchain = options.toolchain ?? env.ELAN_TOOLCHAIN;
  if (!toolchain) {
    const pin = directories.map(dir => join(dir, "lean-toolchain")).find(file => statSync(file, { throwIfNoEntry: false })?.isFile());
    if (pin) toolchain = (subject.readDependency ? subject.readDependency(pin) : readFileSync(pin, "utf8")).trim();
  }
  if (toolchain) env.ELAN_TOOLCHAIN = toolchain;
  return { binary, env };
}
