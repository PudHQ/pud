import { parseExpression } from "@babel/parser";
import { Unsupported, type SubjectSource } from "@pud/model/adapter";
import type { NativeProofTerm, ProofAssistant, ProofClaim, ProofComparison, ProofConstraint, ProofExpression, ProofModule, ProofOutcome, ProofTarget, ProofType } from "@pud/model/assistant";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "../suite-authoring.ts";
import { leanCommand, type LeanOptions } from "./command.ts";
import { lowerSubject, type Subject } from "./subject.ts";
import { leanTypes, ofSort, readValue, type Sort, type Value } from "./syntax.ts";

export type { LeanOptions } from "./command.ts";
export const lean = native("lean");

const trustedAxioms = new Set(["propext", "Quot.sound", "Classical.choice"]);
const operators: Record<ProofComparison, string> = { eq: "=", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const autoProof = `by
  simp only [claim]
  intros
  try simp_all [impl, Id.run]
  all_goals (repeat' (first | split | constructor))
  all_goals ((try simp_all) <;> omega)`;

function proofType(sort: Sort, itemType: string | undefined): ProofType {
  switch (sort) {
    case "integer":
    case "boolean": return { kind: sort };
    case "integers": return { kind: "array", item: { kind: "integer" } };
    case "items": return { kind: "array", item: { kind: "opaque", name: itemType! } };
    case "textOrItems": return { kind: "textOrArray", item: { kind: "opaque", name: itemType! } };
  }
}

function readOperand(expression: ProofExpression, parameters: ReadonlyMap<string, Value>, expected?: Sort) {
  const { file, source, line, column, offset, bindings } = expression;
  const scope = new Map([...bindings].map(([name, parameter]) => [name, parameters.get(parameter)!]));
  try {
    const node = parseExpression(source, { plugins: ["typescript"], startLine: line, startColumn: column, startIndex: offset });
    const value = readValue(file, node, scope);
    return expected ? ofSort(file, node, value, expected) : value.code;
  } catch (error) {
    if (error instanceof Unsupported) throw error;
    throw new Unsupported(`${file}:${line}:${column + 1}: ${(error as Error).message}`);
  }
}

function renderTerm(term: NativeProofTerm, parameters: ReadonlyMap<string, Value>) {
  if (term.assistant !== "lean") throw new Unsupported(`This proof term requires ${term.assistant}.`);
  const args = term.args.map(arg => readOperand(arg, parameters));
  if (term.kind === "reference") return [term.name, ...args].join(" ");
  return `(${term.parts.map((part, i) => i ? `(${args[i - 1]})${part}` : part).join("")})`;
}

function renderTarget(target: ProofTarget, result: Value, parameters: ReadonlyMap<string, Value>) {
  if (target.kind === "result") return result;
  const parameter = parameters.get(target.name);
  if (!parameter) throw new Unsupported(`No subject parameter named '${target.name}'.`);
  return parameter;
}

function renderConstraint(constraint: ProofConstraint, result: Value, parameters: ReadonlyMap<string, Value>) {
  if (constraint.kind === "condition") return `(${readOperand(constraint.expression, parameters, "boolean")} = true)`;
  const value = renderTarget(constraint.target, result, parameters);
  if (constraint.kind === "native") return `((${renderTerm(constraint.term, parameters)} ${value.code}) : Prop)`;
  return `(${value.code} ${operators[constraint.operator]} ${readOperand(constraint.value, parameters, value.sort)})`;
}

function indent(code: string) { return code.split("\n").map(line => `  ${line}`).join("\n"); }

function generate(subject: Subject, claim: ProofClaim, imports: readonly string[]) {
  const { params, itemType, definition } = subject;
  const parameters = new Map(params.map(p => [p.name, p]));
  const result = { sort: subject.result, code: "result" };
  const render = (constraint: ProofConstraint) => renderConstraint(constraint, result, parameters);
  const binders = [itemType && "(Item : Type)", ...params.map(param => `(${param.code} : ${leanTypes[param.sort]})`)].filter(Boolean).join(" ");
  const args = [itemType && "(Item := Item)", ...params.map(param => param.code)].filter(Boolean).join(" ");
  const proposition = [binders && `∀ ${binders},`, ...claim.premises.map(p => `${render(p)} →`), `let result := impl ${args}`.trimEnd(),
    claim.assertions.map(render).join(" ∧\n")].filter(Boolean).join("\n");
  return [
    "import Std", ...imports.map(module => `import ${module}`), "", "namespace Pud", "", "set_option autoImplicit false", "",
    definition, "", "def claim : Prop :=", indent(proposition), "",
    "theorem checked : claim :=", indent(claim.proof ? renderTerm(claim.proof, parameters) : autoProof), "", "end Pud", "",
  ].join("\n");
}

class RejectedProof extends Error {}

function leanAt(dir: string, command: ReturnType<typeof leanCommand>) {
  return (module: string, source: string, compile = false) => {
    const file = `${module}.lean`;
    const artifact = `${module}.olean`;
    writeFileSync(join(dir, file), source);
    const run = spawnSync(command.binary, compile ? ["-o", artifact, file] : [file], {
      cwd: dir, env: { ...command.env, LEAN_PATH: dir }, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
    });
    if (run.error && "code" in run.error && run.error.code === "ENOENT") {
      throw new Error("Install Lean with Elan or set PUD_LEAN to a working Lean executable.");
    }
    if (run.error) throw run.error;
    if (run.signal) throw new Error(`Lean was interrupted by ${run.signal} while checking ${file}.`);
    if (run.status !== 0) throw new RejectedProof([run.stdout, run.stderr].filter(Boolean).join("\n").trim() || `Lean rejected ${file}.`);
    if (compile && !existsSync(join(dir, artifact))) throw new Error(`Lean did not produce ${artifact}.`);
    return run.stdout.trim();
  };
}

function audit(module: string, run: ReturnType<typeof leanAt>) {
  const report = run("PudAudit", [
    `import ${module}`, "set_option autoImplicit false",
    "theorem pudAuditCertificate : Pud.claim := Pud.checked",
    "#print axioms pudAuditCertificate", "",
  ].join("\n"));
  if (report === "'pudAuditCertificate' does not depend on any axioms") return;
  const axioms = /^'pudAuditCertificate' depends on axioms: \[([^\]]+)\]$/.exec(report)?.[1]?.split(",").map(name => name.trim());
  if (!axioms || axioms.some(name => !trustedAxioms.has(name))) {
    throw new RejectedProof(`Lean did not certify the expected claim with approved axioms.\n${report}`);
  }
}

function moduleNames(modules: readonly ProofModule[]) {
  return modules.map(({ file }, i) => {
    if (!file.endsWith(".lean")) throw new Unsupported(`Expected a .lean support module. Received ${file}.`);
    return `PudSupport${i}`;
  });
}

function verify(subject: Subject, source: SubjectSource, options: LeanOptions, claims: readonly ProofClaim[], modules: readonly ProofModule[]): ProofOutcome[] {
  const imports = moduleNames(modules);
  const units = claims.map(claim => {
    try { return { unit: generate(subject, claim, imports) }; }
    catch (error) {
      if (!(error instanceof Unsupported)) throw error;
      return { outcome: { status: "unsupported", detail: error.message } as const };
    }
  });
  if (units.every(entry => "outcome" in entry)) return units.map(entry => entry.outcome!);
  const dir = mkdtempSync(join(tmpdir(), "pud-lean-"));
  try {
    const run = leanAt(dir, leanCommand(source, options));
    for (const [i, module] of modules.entries()) {
      try { run(imports[i]!, module.source, true); }
      catch (error) { throw new Error(`${module.file}\n${(error as Error).message}`); }
    }
    return units.map((entry, i) => {
      if (entry.outcome) return entry.outcome;
      try {
        const module = `PudClaim${i}`;
        run(module, entry.unit, true);
        audit(module, run);
        return { status: "proved" };
      } catch (error) {
        const detail = (error as Error).message;
        return { status: error instanceof RejectedProof ? "unproved" : "error", detail };
      }
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function leanAdapter(options: LeanOptions = {}): ProofAssistant<"lean"> {
  return {
    id: "lean",
    prepare(source) {
      const subject = lowerSubject(source.file, source.name, source.source);
      return {
        parameters: subject.params.map(p => ({ name: p.name, type: proofType(p.sort, subject.itemType) })),
        result: proofType(subject.result, subject.itemType),
        emit(claim, modules) { return generate(subject, claim, moduleNames(modules)); },
        async verify(claims, modules) { return verify(subject, source, options, claims, modules); },
      };
    },
  };
}
