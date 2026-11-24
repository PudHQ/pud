import { parseExpression } from "@babel/parser";
import type { Node } from "@babel/types";
import { Unsupported, type SubjectSource } from "@pud/model/adapter";
import type { NativeProofTerm, ProofAssistant, ProofClaim, ProofComparison, ProofConstraint, ProofExpression, ProofModule, ProofOutcome, ProofPredicate, ProofType } from "@pud/model/assistant";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "../suite-authoring.ts";
import { leanCommand, type LeanOptions } from "./command.ts";
import { lowerSubject, type Subject } from "./subject.ts";
import { leanTypes, ofSort, readProposition, readValue, type Sort, type Value } from "./syntax.ts";

export type { LeanOptions } from "./command.ts";
export const lean = native("lean");

const trustedAxioms = new Set(["propext", "Quot.sound", "Classical.choice"]);
const operators: Record<ProofComparison, string> = { eq: "=", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const autoProof = `by
  simp only [claim]
  intros
  first
  | rfl
  | try simp_all [impl, Id.run, Int.add_nonneg, Int.tmod_eq_emod_of_nonneg, Int.tdiv_eq_ediv_of_nonneg]
    all_goals (repeat' (split <;> try simp_all))
    all_goals (first | rfl | omega)
  | try simp_all [impl, Id.run]
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

type Scope = ReadonlyMap<string, Value>;
const emptyScope: Scope = new Map();
const logicalOperators = { and: "∧", or: "∨", implies: "→", iff: "↔" } as const;

function readOperand<T>(
  expression: ProofExpression, parameters: Scope, locals: Scope,
  read: (file: string, node: Node, scope: Scope, helpers?: ReadonlySet<string>) => T,
): T {
  const { file, source, line, column, offset, bindings, schemaBindings } = expression;
  const scope = new Map([...bindings].map(([name, parameter]) => [name, parameters.get(parameter)!]));
  for (const [name, value] of locals) scope.set(name, value);
  try {
    const node = parseExpression(source, { plugins: ["typescript"], startLine: line, startColumn: column, startIndex: offset });
    return read(file, node, scope, schemaBindings);
  } catch (error) {
    if (error instanceof Unsupported) throw error;
    throw new Unsupported(`${file}:${line}:${column + 1}: ${(error as Error).message}`);
  }
}

function indent(code: string) { return code.split("\n").map(line => `  ${line}`).join("\n"); }

function generate(subject: Subject, claim: ProofClaim, imports: readonly string[]) {
  const { params, itemType, definition } = subject;
  const parameters = new Map(params.map(p => [p.name, p]));
  const result: Value = { sort: subject.result, code: "result" };
  let nextBinder = 0;

  function operand(expression: ProofExpression, locals: Scope, expected?: Sort) {
    return readOperand(expression, parameters, locals, (file, node, scope, helpers) => {
      const value = readValue(file, node, scope, helpers);
      return expected ? ofSort(file, node, value, expected) : value.code;
    });
  }

  function term(proof: NativeProofTerm, locals: Scope) {
    if (proof.assistant !== "lean") throw new Unsupported(`This proof term requires ${proof.assistant}.`);
    const args = proof.args.map(arg => operand(arg, locals));
    if (proof.kind === "reference") return [proof.name, ...args].join(" ");
    return `(${proof.parts.map((part, i) => i ? `(${args[i - 1]})${part}` : part).join("")})`;
  }

  function predicate(spec: ProofPredicate, locals: Scope): string {
    switch (spec.kind) {
      case "boolean": return readOperand(spec.expression, parameters, locals, readProposition);
      case "not": return `(¬ ${predicate(spec.operand, locals)})`;
      case "binary": return `(${predicate(spec.left, locals)} ${logicalOperators[spec.operator]} ${predicate(spec.right, locals)})`;
      case "quantifier": {
        const { domain } = spec;
        const value: Value = { sort: domain.kind === "schema" ? domain.type : "integer", code: `q${nextBinder++}` };
        // The domain is outside the scope of the new binder, even when callback names repeat.
        const restrictions = domain.kind === "schema"
          ? domain.constraints.map(clause => renderConstraint(clause, locals, value))
          : [`(${value.code} ∈ ${operand(domain.expression, locals, "integers")})`];
        const body = predicate(spec.predicate, new Map([...locals, [spec.variable, value]]));
        const binder = `(${value.code} : ${leanTypes[value.sort]})`;
        const connective = spec.quantifier === "forall" ? "→" : "∧";
        const symbol = spec.quantifier === "forall" ? "∀" : "∃";
        const guarded = restrictions.length ? `(${restrictions.join(" ∧ ")}) ${connective} ${body}` : body;
        return `(${symbol} ${binder}, ${guarded})`;
      }
    }
  }

  function renderConstraint(constraint: ProofConstraint, locals: Scope, quantified?: Value): string {
    if (constraint.kind === "condition") return `(${operand(constraint.expression, locals, "boolean")} = true)`;
    if (constraint.kind === "proposition") return predicate(constraint.predicate, locals);
    const target = constraint.target;
    const value = target.kind === "result" ? result : target.kind === "quantified" ? quantified : parameters.get(target.name);
    if (!value) throw new Unsupported("The property constraint has no corresponding value.");
    if (constraint.kind === "refinement") return predicate(constraint.predicate, new Map([...locals, [constraint.variable, value]]));
    if (constraint.kind === "native") return `((${term(constraint.term, locals)} ${value.code}) : Prop)`;
    return `(${value.code} ${operators[constraint.operator]} ${operand(constraint.value, locals, value.sort)})`;
  }

  const render = (constraint: ProofConstraint) => renderConstraint(constraint, emptyScope);
  const binders = [itemType && "(Item : Type)", ...params.map(param => `(${param.code} : ${leanTypes[param.sort]})`)].filter(Boolean).join(" ");
  const args = [itemType && "(Item := Item)", ...params.map(param => param.code)].filter(Boolean).join(" ");
  const proposition = [binders && `∀ ${binders},`, ...claim.premises.map(p => `${render(p)} →`), `let result := impl ${args}`.trimEnd(),
    claim.assertions.map(render).join(" ∧\n")].filter(Boolean).join("\n");
  return [
    "import Std", ...imports.map(module => `import ${module}`), "", "namespace Pud", "", "set_option autoImplicit false", "",
    definition, "", "def claim : Prop :=", indent(proposition), "",
    "theorem checked : claim :=", indent(claim.proof ? term(claim.proof, emptyScope) : autoProof), "", "end Pud", "",
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
