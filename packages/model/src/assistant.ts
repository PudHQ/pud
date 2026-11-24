import type { Counterexample, ReviewedProperty, SubjectSource } from "./adapter.ts";

export type ProofType =
  | { kind: "integer" | "boolean" }
  | { kind: "opaque"; name: string }
  | { kind: "array" | "textOrArray"; item: ProofType };

/** A TypeScript expression and its mapping from callback bindings to subject parameters. */
export interface ProofExpression extends Omit<ReviewedProperty, "expression"> {
  bindings: ReadonlyMap<string, string>;
  /** In-scope references to Pud's specification helpers. */
  schemaBindings?: ReadonlySet<string>;
}

export type NativeProofTerm = { assistant: string; args: readonly ProofExpression[] } & (
  | { kind: "reference"; name: string }
  | { kind: "template"; parts: readonly string[] }
);

export type ProofTarget = { kind: "parameter"; name: string } | { kind: "result" } | { kind: "quantified" };
export type ProofComparison = "eq" | "gt" | "gte" | "lt" | "lte";

export type ProofPredicate =
  | { kind: "boolean"; expression: ProofExpression }
  | { kind: "not"; operand: ProofPredicate }
  | { kind: "binary"; operator: "and" | "or" | "implies" | "iff"; left: ProofPredicate; right: ProofPredicate }
  | {
    kind: "quantifier";
    quantifier: "forall" | "exists";
    variable: string;
    domain: { kind: "array"; expression: ProofExpression }
      | { kind: "schema"; type: "integer" | "boolean"; constraints: readonly ProofConstraint[] };
    predicate: ProofPredicate;
  };

export type ProofConstraint =
  | { kind: "condition"; expression: ProofExpression }
  | { kind: "proposition"; predicate: ProofPredicate }
  | { kind: "comparison"; target: ProofTarget; operator: ProofComparison; value: ProofExpression }
  | { kind: "refinement"; target: ProofTarget; variable: string; predicate: ProofPredicate }
  | { kind: "native"; target: ProofTarget; term: NativeProofTerm };

export interface ProofClaim {
  premises: readonly ProofConstraint[];
  assertions: readonly ProofConstraint[];
  proof?: NativeProofTerm;
  observation?: ProofCall;
  expectedError?: ProofErrorKind;
}

export type ProofErrorKind = "Error" | "RangeError" | "TypeError";

export interface ProofCall {
  kind: "call";
  callee: "subject" | { file: string; name: string };
  args: readonly (ProofCall | { kind: "parameter"; name: string })[];
}

export interface ProofModule {
  file: string;
  source: string;
}

export type ProofOutcome =
  | { status: "proved" }
  | { status: "disproved"; counterexample: Counterexample }
  | { status: "unproved" | "unsupported" | "error"; detail: string; diagnostic?: string };

export type ClaimProgress = (index: number, state: "running" | "finished", status?: ProofOutcome["status"]) => void;

/** The adapter has parsed the exact implementation snapshot and can certify claims about it. */
export interface PreparedProofAssistant {
  parameters: readonly { name: string; type: ProofType }[];
  result: ProofType;
  inspectCall?(call: ProofCall): ProofType;
  errors?: readonly ProofErrorKind[];
  emit(claim: ProofClaim, modules: readonly ProofModule[]): string | Promise<string>;
  verify(claims: readonly ProofClaim[], modules: readonly ProofModule[], onClaim?: ClaimProgress): Promise<readonly ProofOutcome[]>;
}

export interface ProofAssistant<Id extends string = string> {
  readonly id: Id;
  prepare(subject: SubjectSource): PreparedProofAssistant | Promise<PreparedProofAssistant>;
}
