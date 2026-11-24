import { parseExpression } from "@babel/parser";
import type { Node } from "@babel/types";
import { Unsupported, type SubjectSource } from "@pud/model/adapter";
import type { NativeProofTerm, ProofAssistant, ProofCall, ProofClaim, ProofComparison, ProofConstraint, ProofErrorKind, ProofExpression, ProofModule, ProofOutcome, ProofPredicate, ProofType } from "@pud/model/assistant";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "../suite-authoring.ts";
import { leanCommand, type LeanOptions } from "./command.ts";
import { definitions, lowerProgram } from "./program.ts";
import { errorKinds, invoke, leanTypes, ofSort, readProposition, readValue, type Sort, type Value } from "./syntax.ts";

export type { LeanOptions } from "./command.ts";
export const lean = native("lean");

const trustedAxioms = new Set(["propext", "Quot.sound", "Classical.choice"]);
const operators: Record<ProofComparison, string> = { eq: "=", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const modeledErrors = Object.keys(errorKinds) as ProofErrorKind[];
const errors = `inductive ErrorKind where
${Object.values(errorKinds).map(kind => `  | ${kind}`).join("\n")}
  deriving DecidableEq, Repr`;
const countdown = `def countdownWhile {m : Type → Type} [Monad m] {σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → m σ) (state : σ) : m (Int × σ) :=
  if _above : counter > limit then do
    let next ← step counter state
    countdownWhile (counter - decrement) limit decrement positive step next
  else pure (counter, state)
termination_by (counter - limit).toNat
decreasing_by omega

@[simp] theorem countdownWhile_stop {m : Type → Type} [Monad m] {σ : Type}
    (counter limit decrement : Int) (positive : 0 < decrement)
    (step : Int → σ → m σ) (state : σ) (stopped : counter ≤ limit) :
    countdownWhile counter limit decrement positive step state = pure (counter, state) := by
  rw [countdownWhile]
  simp [Int.not_lt.mpr stopped]`;

const autoProof = (unfold: string, recursive: readonly string[]) => `by
  simp only [claim]
  intros
  first
  | rfl
  | try simp_all [${unfold}, Int.add_nonneg, Int.tmod_eq_emod_of_nonneg, Int.tdiv_eq_ediv_of_nonneg]
    all_goals (repeat' (split <;> try simp_all))
    all_goals ((try simp (disch := omega) [Int.tmod_eq_emod_of_nonneg, Int.tdiv_eq_ediv_of_nonneg] at *) <;> (first | rfl | omega))${recursive.length ? `
  | solve | simp_all (config := { maxSteps := 500 }) [${unfold}, ${recursive.join(", ")}]` : ""}
  | try simp_all [${unfold}]
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

type Program = ReturnType<typeof lowerProgram>;

function observe(program: Program, observation?: ProofCall) {
  const { root } = program;
  const roots = new Set([root]);
  const parameters = new Map(root.params.map(param => [param.name, param]));
  let next = 0;
  const fresh = () => `callArg${next++}`;
  function call(node: ProofCall): Value {
    const subject = node.callee === "subject" ? root : program.resolve(node.callee.file, node.callee.name);
    if (subject.itemType || subject.params.length !== node.args.length) {
      throw new Unsupported("Pass the full signature of each function in a composed call.");
    }
    roots.add(subject);
    const args = node.args.map((arg, index) => {
      const value = arg.kind === "call" ? call(arg) : parameters.get(arg.name);
      if (value?.sort !== subject.params[index]!.sort) {
        throw new Unsupported("Each argument in a composed call must match the callee's declared type.");
      }
      return value;
    });
    return invoke(subject, args, fresh);
  }
  const args = [root.itemType && "(Item := Item)", ...root.params.map(param => param.code)].filter(Boolean);
  const value = observation ? call(observation) : {
    sort: root.result, code: [root.code, ...args].join(" "), fallible: root.fallible,
  };
  return { value, linked: definitions([...roots]) };
}

function generate(program: Program, claim: ProofClaim, imports: readonly string[]) {
  if (claim.expectedError ? !Object.hasOwn(errorKinds, claim.expectedError) || claim.assertions.length : !claim.assertions.length) {
    throw new Unsupported("State either a return predicate or one modeled exception.");
  }
  const { params, itemType } = program.root;
  const { value: execution, linked } = observe(program, claim.observation);
  const parameters = new Map(params.map(p => [p.name, p]));
  const result: Value = { sort: execution.sort, code: "result" };
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
  const premises = claim.premises.map(p => `${render(p)} →`);
  const assertions = claim.assertions.map(render).join(" ∧\n");
  const goal = claim.expectedError
    ? execution.fallible ? `(${execution.code}) = .error ErrorKind.${errorKinds[claim.expectedError]}` : "False"
    : execution.fallible
      ? `match (${execution.code}) with\n| .ok result =>\n${indent(assertions)}\n| .error _ => False`
      : `let result := ${execution.code}\n${assertions}`;
  const proposition = [binders && `∀ ${binders},`, ...premises, goal].filter(Boolean).join("\n");
  const simplify = [...linked.filter(subject => !subject.recursive).map(subject => subject.code), "Id.run"].join(", ");
  const recursive = linked.filter(subject => subject.recursive).map(subject => subject.code);
  if (linked.some(subject => subject.countdown)) recursive.push("countdownWhile");
  return [
    "import Std", ...imports.map(module => `import ${module}`), "", "namespace Pud", "", "set_option autoImplicit false", "",
    errors, "", ...(linked.some(subject => subject.countdown) ? [countdown, ""] : []),
    linked.map(subject => subject.definition).join("\n\n"), "", "def claim : Prop :=", indent(proposition), "",
    "theorem checked : claim :=", indent(claim.proof ? term(claim.proof, emptyScope) : autoProof(simplify, recursive)), "", "end Pud", "",
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

function verify(program: Program, source: SubjectSource, options: LeanOptions, claims: readonly ProofClaim[], modules: readonly ProofModule[]): ProofOutcome[] {
  const imports = moduleNames(modules);
  const units = claims.map(claim => {
    try { return { unit: generate(program, claim, imports) }; }
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
      const program = lowerProgram(source);
      const subject = program.root;
      return {
        parameters: subject.params.map(p => ({ name: p.name, type: proofType(p.sort, subject.itemType) })),
        result: proofType(subject.result, subject.itemType),
        inspectCall(call) { return proofType(observe(program, call).value.sort, undefined); },
        errors: modeledErrors,
        emit(claim, modules) { return generate(program, claim, moduleNames(modules)); },
        async verify(claims, modules) { return verify(program, source, options, claims, modules); },
      };
    },
  };
}
