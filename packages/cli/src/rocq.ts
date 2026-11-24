import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { RocqDefinition } from "@pud/model/manifest";
import type { ProofBackend } from "@pud/model/adapter";
import type { Model } from "./translate.ts";
import { subjectModule } from "./rocq-model.ts";
import { runProver } from "./prover-process.ts";

export class ProofFailure extends Error {}

type LinkedProof = RocqDefinition & { script: string };

async function checkProof(manifest: LinkedProof, model: Model) {
  const dir = mkdtempSync(join(tmpdir(), "pud-"));
  const cmd = process.env.ROCQ || "rocq";
  const binary = cmd.includes("/") ? resolve(cmd) : cmd;

  async function compile(file: string, problem: string, Failure: new (message: string) => Error = Error) {
    const run = await runProver(binary, ["compile", "-q", "-Q", ".", "Pud", file], { cwd: dir, timeout: 60_000 })
      .catch(error => {
        if (error.code === "ENOENT") throw new Error("Rocq was not found. Put rocq on PATH or set ROCQ to its executable.");
        if (error.signal) throw new Error(`Rocq was stopped by ${error.signal}.`);
        throw new Error(`Could not compile ${file}: ${error.message}`);
      });
    if (run.status !== 0 || !existsSync(join(dir, file + "o"))) {
      const log = [run.stdout, run.stderr].filter(Boolean).join("\n").trim()
        .replace(/"(?:\.\/)?Linked\.v"/g, () => JSON.stringify(manifest.proof));
      throw new Failure(`${problem}${log ? "\n" + log : ""}`);
    }
    return run.stdout.trim();
  }

  try {
    writeFileSync(join(dir, "Subject.v"), subjectModule(model));
    await compile("Subject.v", "Rocq could not compile the generated model. Check that Rocq 9 and its Stdlib are installed.");
    writeFileSync(join(dir, "Linked.v"), manifest.script);
    await compile("Linked.v", "The linked proof did not compile.", ProofFailure);

    // Check the exact type in a fresh module. Only this invocation's output
    // counts: diagnostics printed by the linked script cannot attest to closure.
    const expected = manifest.property ? "Pud.Subject.claim" : `Pud.Subject.agrees Pud.Linked.${manifest.spec}`;
    writeFileSync(join(dir, "Audit.v"), [
      "From Pud Require Subject Linked.",
      `Definition certificate : ${expected} := Pud.Linked.${manifest.theorem}.`,
      "Print Assumptions certificate.",
      "",
    ].join("\n"));
    const claim = manifest.property ? "the reviewed TypeScript property (Subject.claim)" : `Subject.agrees ${manifest.spec}`;
    const assumptions = await compile("Audit.v", `Expected ${manifest.theorem} to prove ${claim}.`, ProofFailure);
    if (assumptions !== "Closed under the global context") {
      throw new ProofFailure(`Rocq did not certify an assumption-free theorem:\n${assumptions || "(no assumptions report)"}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}


export const rocq = {
  emit: (model: Model) => subjectModule(model),
  async verify(model: Model, claims: readonly LinkedProof[]) {
    for (const claim of claims) await checkProof(claim, model);
    return claims.map(() => true);
  },
} satisfies ProofBackend<Model, LinkedProof>;
