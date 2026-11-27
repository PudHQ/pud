import { once } from "node:events";
import { Unsupported } from "./assistant.ts";
import { checkFiles, emit, type CheckProgress } from "./check.ts";
import type { ProjectReply, ProjectRequest } from "./run.ts";

const send = (reply: ProjectReply) => process.send!(reply);
function progress(event: CheckProgress) {
  // Apply synchronous progress callbacks in the caller before rechecking the files.
  const acknowledged = event.kind === "validating" ? once(process, "message") : undefined;
  send({ kind: "progress", event });
  return acknowledged;
}

process.once("disconnect", () => process.exit());
process.once("message", async (request: ProjectRequest) => {
  try {
    const value = request.kind === "check"
      ? await checkFiles(request.files, { onProgress: request.progress ? progress : undefined })
      : await emit(request.file, { property: request.property });
    send({ kind: "result", value });
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
    send({ kind: "error", error, unsupported: error instanceof Unsupported, code });
  }
});
