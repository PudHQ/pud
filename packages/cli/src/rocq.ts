import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ProofDefinition } from "./manifest.ts";
import { subjectModule, type Model } from "./translate.ts";

export class ProofFailure extends Error {}

export function checkProof(manifest: ProofDefinition, model: Model) {
  const dir = mkdtempSync(join(tmpdir(), "pud-"));
  const cmd = process.env.ROCQ || "rocq";
  const binary = cmd.includes("/") ? resolve(cmd) : cmd;

  function compile(file: string, problem: string, Failure: new (message: string) => Error = Error) {
    const run = spawnSync(binary, ["compile", "-q", "-Q", ".", "Pud", file], {
      cwd: dir, encoding: "utf8", timeout: 60_000,
    });
    if (run.error && "code" in run.error && run.error.code === "ENOENT") {
      throw new Error("Rocq was not found. Put rocq on PATH or set ROCQ to its executable.");
    }
    if (run.error) throw new Error(`Could not compile ${file}: ${run.error.message}`);
    if (run.signal) throw new Error(`Rocq was stopped by ${run.signal}.`);
    if (run.status !== 0 || !existsSync(join(dir, file + "o"))) {
      const log = [run.stdout, run.stderr].filter(Boolean).join("\n").trim()
        .replace(/"(?:\.\/)?Linked\.v"/g, () => JSON.stringify(manifest.proof));
      throw new Failure(`${problem}${log ? "\n" + log : ""}`);
    }
    return run.stdout.trim();
  }

  try {
    copyFileSync(manifest.proof, join(dir, "Linked.v"));
    writeFileSync(join(dir, "Subject.v"), subjectModule(model));
    compile("Subject.v", "Rocq could not compile the generated model. Check that Rocq 9 and its Stdlib are installed.");
    compile("Linked.v", "The linked proof did not compile.", ProofFailure);

    // Check the exact type in a fresh module. Only this invocation's output
    // counts: diagnostics printed by the linked script cannot attest to closure.
    writeFileSync(join(dir, "Audit.v"), [
      "From Pud Require Subject Linked.",
      `Definition certificate : Pud.Subject.agrees Pud.Linked.${manifest.spec} := Pud.Linked.${manifest.theorem}.`,
      "Print Assumptions certificate.",
      "",
    ].join("\n"));
    const assumptions = compile("Audit.v", `Expected ${manifest.theorem} to prove Subject.agrees ${manifest.spec}.`, ProofFailure);
    if (assumptions !== "Closed under the global context") {
      throw new ProofFailure(`Rocq did not certify an assumption-free theorem:\n${assumptions || "(no assumptions report)"}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
