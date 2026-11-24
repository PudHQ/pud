import { parseExpression } from "@babel/parser";
import type { Node } from "@babel/types";
import { Unsupported, type SubjectSource } from "@pud/model/adapter";
import type { NativeProofTerm, ProofAssistant, ProofCall, ProofClaim, ProofComparison, ProofConstraint, ProofErrorKind, ProofExpression, ProofModule, ProofOutcome, ProofPredicate, ProofType } from "@pud/model/assistant";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { native } from "../suite-authoring.ts";
import { runProver } from "../prover-process.ts";
import { leanCommand, type LeanOptions } from "./command.ts";
import { definitions, lowerProgram } from "./program.ts";
import { iterationSemantics, scalarCall, scalarSemantics, scalarValue } from "./scalar.ts";
import { asOutcome, errorKinds, invoke, leanTypes, ofSort, readProposition, readValue, type Sort, type Value } from "./syntax.ts";

export type { LeanOptions } from "./command.ts";
export const lean = native("lean");

const trustedAxioms = new Set(["propext", "Quot.sound", "Classical.choice"]);
const operators: Record<ProofComparison, string> = { eq: "=", gt: ">", gte: "≥", lt: "<", lte: "≤" };
const modeledErrors = Object.keys(errorKinds) as ProofErrorKind[];
const errors = `inductive ErrorKind where
${Object.values(errorKinds).map(kind => `  | ${kind}`).join("\n")}
  deriving DecidableEq, Repr`;
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
  type Observation = { value: Value; source?: ReturnType<typeof scalarValue> };
  function call(node: ProofCall): Observation {
    const subject = node.callee === "subject" ? root : program.resolve(node.callee.file, node.callee.name);
    if (subject.itemType || subject.params.length !== node.args.length) {
      throw new Unsupported("Pass the full signature of each function in a composed call.");
    }
    roots.add(subject);
    const args = node.args.map((arg, index) => {
      const param = arg.kind === "parameter" ? parameters.get(arg.name) : undefined;
      const operand = arg.kind === "call" ? call(arg) : param && { value: param, source: scalarValue(param.sort, param.code) };
      if (operand?.value.sort !== subject.params[index]!.sort) {
        throw new Unsupported("Each argument in a composed call must match the callee's declared type.");
      }
      return operand;
    });
    return { value: invoke(subject, args.map(arg => arg.value), fresh), source: scalarCall(subject, args.map(arg => arg.source), fresh) };
  }
  const args = [root.itemType && "(Item := Item)", ...root.params.map(param => param.code)].filter(Boolean);
  const observed: Observation = observation ? call(observation) : {
    value: { sort: root.result, code: [root.code, ...args].join(" "), fallible: root.fallible },
    source: root.sourceExpression && (root.result === "integer" || root.result === "boolean")
      ? { sort: root.result, code: `(${[`${root.code}Source`, ...args].join(" ")})` } : undefined,
  };
  return { ...observed, linked: definitions([...roots]) };
}

function loweringProof(observed: ReturnType<typeof observe>, binders: string) {
  if (!observed.source) return;
  const proved = observed.linked.filter(subject => subject.sourceExpression);
  function normalize(rewrite: readonly string[]) {
    const rules = [...rewrite, "Scalar.lower", "Scalar.Binary.lower", "Scalar.Unary.apply", "Id.run", "bind", "pure", "Except.pure"];
    return `first
  | rfl
  | simp [${rules.join(", ")}]
    all_goals (repeat' (split <;> try simp_all))
    all_goals (first | rfl | simp_all | omega)`;
  }
  const sourceDefinitions = proved.map(subject => {
    const source = subject.code + "Source";
    const params = subject.params.map(p => ` (${p.code} : ${leanTypes[p.sort]})`).join("");
    const args = subject.params.map(p => " " + p.code).join("");
    const invocation: Value = { sort: subject.result, code: subject.code + args, fallible: subject.fallible };
    return `def ${source}${params} : Scalar.Expr ErrorKind .${subject.result} :=
  ${subject.sourceExpression}

theorem ${subject.code}Lowering${params} :
    Scalar.lower (${source}${args}) = ${asOutcome(invocation)} := by
${indent(normalize([source, subject.code, ...[...subject.callees].map(callee => callee.code + "Lowering")]))}`;
  });
  return [...sourceDefinitions, `def loweringClaim : Prop :=
  ${binders ? `∀ ${binders},\n  ` : ""}Scalar.evaluate ${observed.source.code} = ${asOutcome(observed.value)}

theorem loweringCertificate : loweringClaim := by
  simp only [loweringClaim]
  intros
  rw [Scalar.preservation]
${indent(normalize(proved.map(subject => subject.code + "Lowering")))}`].join("\n\n");
}

function generate(program: Program, claim: ProofClaim, imports: readonly string[]) {
  if (claim.expectedError ? !Object.hasOwn(errorKinds, claim.expectedError) || claim.assertions.length : !claim.assertions.length) {
    throw new Unsupported("State either a return predicate or one modeled exception.");
  }
  const { params, itemType } = program.root;
  const observed = observe(program, claim.observation);
  const { value: execution, linked } = observed;
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
  function proposition(outcome: Value) {
    const goal = claim.expectedError
      ? outcome.fallible ? `(${outcome.code}) = .error ErrorKind.${errorKinds[claim.expectedError]}` : "False"
      : outcome.fallible
        ? `match (${outcome.code}) with\n| .ok result =>\n${indent(assertions)}\n| .error _ => False`
        : `let result := ${outcome.code}\n${assertions}`;
    return [binders && `∀ ${binders},`, ...premises, goal].filter(Boolean).join("\n");
  }
  const simplify = [...linked.filter(subject => !subject.recursive).map(subject => subject.code), "Id.run"].join(", ");
  const recursive = linked.filter(subject => subject.recursive).map(subject => subject.code);
  const countdown = linked.some(subject => subject.countdown);
  const fold = linked.some(subject => subject.fold);
  if (countdown) recursive.push("countdownWhile");
  const certificate = loweringProof(observed, binders);
  const sourceClaim = observed.source && proposition({
    sort: observed.source.sort, code: `Scalar.evaluate ${observed.source.code}`, fallible: true,
  });
  const unit = [
    "import Std", ...imports.map(module => `import ${module}`), "", ...(certificate ? [scalarSemantics, ""] : []),
    ...(countdown || fold ? [iterationSemantics, ""] : []),
    "namespace Pud", "", "set_option autoImplicit false", "",
    errors, "",
    linked.map(subject => subject.definition).join("\n\n"), "", ...(certificate ? [certificate, ""] : []),
    "def claim : Prop :=", indent(proposition(execution)), "",
    ...(sourceClaim ? ["def sourceClaim : Prop :=", indent(sourceClaim), ""] : []),
    "theorem checked : claim :=", indent(claim.proof ? term(claim.proof, emptyScope) : autoProof(simplify, recursive)), "",
    ...(sourceClaim ? [`theorem sourceChecked : sourceClaim := by
  have preservation := loweringCertificate
  unfold loweringClaim at preservation
  simpa [sourceClaim, claim, preservation] using checked`, ""] : []),
    "end Pud", "",
  ].join("\n");
  const iterationTheorems = [
    ...(countdown ? ["Pud.countdownWhile_except_correct", "Pud.countdownWhile_pure_correct"] : []),
    ...(fold ? ["Pud.denseForOf_correct"] : []),
  ];
  return { unit, certifiedLowering: !!certificate, iterationTheorems };
}

class RejectedProof extends Error {}

function leanAt(dir: string, command: ReturnType<typeof leanCommand>) {
  return async (module: string, source: string, compile = false) => {
    const file = `${module}.lean`;
    const artifact = `${module}.olean`;
    writeFileSync(join(dir, file), source);
    const run = await runProver(command.binary, compile ? ["-o", artifact, file] : [file], {
      cwd: dir, env: { ...command.env, LEAN_PATH: dir }, timeout: 30_000, maxBuffer: 1024 * 1024,
    }).catch(error => {
      if (error.code === "ENOENT") throw new Error("Install Lean with Elan or set PUD_LEAN to a working Lean executable.");
      if (error.signal) throw new Error(`Lean was interrupted by ${error.signal} while checking ${file}.`);
      throw error;
    });
    if (run.status !== 0) throw new RejectedProof([run.stdout, run.stderr].filter(Boolean).join("\n").trim() || `Lean rejected ${file}.`);
    if (compile && !existsSync(join(dir, artifact))) throw new Error(`Lean did not produce ${artifact}.`);
    return run.stdout.trim();
  };
}

async function audit(module: string, run: ReturnType<typeof leanAt>, certificate: ReturnType<typeof generate>) {
  const { certifiedLowering, iterationTheorems } = certificate;
  const certificates = ["pudAuditCertificate",
    ...(certifiedLowering ? ["pudLoweringAuditCertificate", "pudSourceAuditCertificate"] : []), ...iterationTheorems];
  const report = await run("PudAudit", [
    `import ${module}`, "set_option autoImplicit false",
    "theorem pudAuditCertificate : Pud.claim := Pud.checked",
    ...(certifiedLowering ? [
      "theorem pudLoweringAuditCertificate : Pud.loweringClaim := Pud.loweringCertificate",
      "theorem pudSourceAuditCertificate : Pud.sourceClaim := Pud.sourceChecked",
    ] : []),
    ...certificates.map(name => `#print axioms ${name}`), "",
  ].join("\n"));
  const lines = report.split("\n");
  const approved = certificates.every((name, index) => {
    const line = lines[index];
    if (line === `'${name}' does not depend on any axioms`) return true;
    const prefix = `'${name}' depends on axioms: [`;
    return line?.startsWith(prefix) && line.endsWith("]") &&
      line.slice(prefix.length, -1).split(",").every(axiom => trustedAxioms.has(axiom.trim()));
  });
  if (lines.length !== certificates.length || !approved) {
    throw new RejectedProof(`Lean did not certify the expected claim with approved axioms.\n${report}`);
  }
}

function moduleNames(modules: readonly ProofModule[]) {
  return modules.map(({ file }, i) => {
    if (!file.endsWith(".lean")) throw new Unsupported(`Expected a .lean support module. Received ${file}.`);
    return `PudSupport${i}`;
  });
}

async function verify(
  program: Program, source: SubjectSource, options: LeanOptions, claims: readonly ProofClaim[],
  modules: readonly ProofModule[], onClaim?: (index: number, state: "running" | "finished") => void,
): Promise<ProofOutcome[]> {
  const imports = moduleNames(modules);
  const units = claims.map(claim => {
    try { return generate(program, claim, imports); }
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
      try { await run(imports[i]!, module.source, true); }
      catch (error) { throw new Error(`${module.file}\n${(error as Error).message}`); }
    }
    const outcomes: ProofOutcome[] = [];
    for (const [i, entry] of units.entries()) {
      if ("outcome" in entry) {
        outcomes.push(entry.outcome);
        onClaim?.(i, "finished");
        continue;
      }
      onClaim?.(i, "running");
      try {
        const module = `PudClaim${i}`;
        await run(module, entry.unit, true);
        await audit(module, run, entry);
        outcomes.push({ status: "proved" });
      } catch (error) {
        const detail = (error as Error).message;
        outcomes.push({ status: error instanceof RejectedProof ? "unproved" : "error", detail });
      } finally {
        onClaim?.(i, "finished");
      }
    }
    return outcomes;
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
        emit(claim, modules) { return generate(program, claim, moduleNames(modules)).unit; },
        verify(claims, modules, onClaim) { return verify(program, source, options, claims, modules, onClaim); },
      };
    },
  };
}
