import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = new URL("../src/cli.ts", import.meta.url);
const dir = mkdtempSync(join(tmpdir(), "pud-demo-"));
const manifest = "bounds.proof.ts";
const subject = join(dir, "bounds.ts");

function check(title: string, status: number, expected: RegExp) {
  console.log(title);
  const run = spawnSync(process.execPath, [Bun.fileURLToPath(cli), manifest], {
    cwd: dir, encoding: "utf8", env: { ...process.env, NO_COLOR: "1" },
  });
  if (run.error) throw run.error;
  process.stdout.write(run.stdout + run.stderr);
  if (run.status !== status || !expected.test(run.stdout + run.stderr)) {
    throw new Error(`Expected ${expected} (exit ${status}), got exit ${run.status}.`);
  }
}

try {
  for (const file of ["bounds.ts", manifest, "Maximum.v", "Minimum.v"]) {
    copyFileSync(new URL(file, import.meta.url), join(dir, file));
  }
  const original = readFileSync(subject, "utf8");
  const reviewed = readFileSync(join(dir, manifest), "utf8");
  check("Original implementation", 0, /^PASS\s+max\b/m);

  writeFileSync(subject, original.replace("a < b ? b : a", "b < a ? a : b"));
  check("\nEquivalent implementation, original proof", 1, /^UNPROVED\s+max\b/m);

  copyFileSync(new URL("./repair/Maximum.v", import.meta.url), join(dir, "Maximum.v"));
  check("\nSame implementation, replaying the agent's saved proof repair", 0, /^PASS\s+max\b/m);

  writeFileSync(subject, original.replace("a < b ? b : a", "a < b ? a : b"));
  check("\nWrong implementation", 1, /max\(0n, 1n\) returned 0n/);
  if (readFileSync(join(dir, manifest), "utf8") !== reviewed) throw new Error("The reviewed property changed.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
