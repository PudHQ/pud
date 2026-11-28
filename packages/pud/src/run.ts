import { failure, Unsupported } from "./assistant.ts";
import { checkFiles as checkInProcess, emit as emitInProcess, type CheckOptions, type CheckProgress, type CheckReport, type EmitOptions } from "./check.ts";

type CheckRequest = { kind: "check"; files: readonly string[]; progress: boolean };
type EmitRequest = { kind: "emit"; file: string; property?: string };
export type ProjectRequest = CheckRequest | EmitRequest;
export type ProjectReply =
  | { kind: "progress"; event: CheckProgress }
  | { kind: "result"; value: CheckReport[] | string }
  | { kind: "error"; error: Error; unsupported: boolean; code?: string };

function runProject(request: CheckRequest, onProgress?: CheckOptions["onProgress"]): Promise<CheckReport[]>;
function runProject(request: EmitRequest): Promise<string>;
async function runProject(request: ProjectRequest, onProgress?: CheckOptions["onProgress"]): Promise<CheckReport[] | string> {
  let reply: Exclude<ProjectReply, { kind: "progress" }> | undefined;
  let callbackFailure: { cause: unknown } | undefined;
  // Each batch owns its Bun module cache. Project output goes to stderr, while IPC carries proof data.
  const child = Bun.spawn([process.execPath, Bun.resolveSync("./project-runner.js", import.meta.dir)], {
    stdin: "inherit", stdout: 2, stderr: "inherit",
    ipc(message: ProjectReply, worker) {
      if (message.kind === "progress") {
        try {
          onProgress?.(message.event);
          if (message.event.kind === "validating") worker.send("continue");
        } catch (cause) {
          callbackFailure = { cause };
          worker.kill();
        }
      } else {
        reply = message;
        worker.disconnect();
      }
    },
  });
  child.send(request);
  const code = await child.exited;
  if (callbackFailure) throw callbackFailure.cause;
  if (reply?.kind === "result") return reply.value;
  const error = reply?.error ?? new Error(`Project process exited with ${child.signalCode ?? code} before returning its result.`);
  if (reply?.unsupported) Object.setPrototypeOf(error, Unsupported.prototype);
  if (reply?.code) Object.assign(error, { code: reply.code });
  if (request.kind === "emit") throw error;
  return request.files.map(file => ({ file, results: [failure(error)] }));
}

/** Check a batch against shared snapshots, loading project config once per run. */
export function checkFiles(files: readonly string[], options: CheckOptions = {}): Promise<CheckReport[]> {
  if (options.adapter || !files.length) return checkInProcess(files, options);
  return runProject({ kind: "check", files, progress: !!options.onProgress }, options.onProgress);
}

export async function check(file: string, options?: CheckOptions): Promise<CheckReport> {
  return (await checkFiles([file], options))[0]!;
}

/** Emit the same verification unit as pud.dev --emit, without running a prover. */
export function emit(file: string, selector?: string | EmitOptions): Promise<string> {
  const options = typeof selector === "string" ? { property: selector } : selector ?? {};
  return options.adapter ? emitInProcess(file, options) : runProject({ kind: "emit", file, property: options.property });
}
