import { execFile, type ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** A normal prover rejection is evidence. Startup, timeout and signal failures are tool errors. */
export async function runProver(binary: string, args: string[], options: ExecFileOptions) {
  try {
    const { stdout, stderr } = await exec(binary, args, { ...options, encoding: "utf8" });
    return { status: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number | string; killed?: boolean; signal?: string; stdout?: string; stderr?: string };
    if (typeof failure.code !== "number" || failure.killed || failure.signal) throw error;
    return { status: failure.code, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}
