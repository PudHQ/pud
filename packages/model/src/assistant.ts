import type { Counterexample, ReviewedProperty, SubjectSource } from "./adapter.ts";

export type ProofType =
  | { kind: "integer" | "boolean" }
  | { kind: "opaque"; name: string }
  | { kind: "array" | "textOrArray"; item: ProofType };

/** A TypeScript expression and its mapping from callback bindings to subject parameters. */
export interface ProofExpression extends Omit<ReviewedProperty, "expression"> {
  bindings: ReadonlyMap<string, string>;
}

export type NativeProofTerm = { assistant: string; args: readonly ProofExpression[] } & (
  | { kind: "reference"; name: string }
  | { kind: "template"; parts: readonly string[] }
);

export type ProofTarget = { kind: "parameter"; name: string } | { kind: "result" };
export type ProofComparison = "eq" | "gt" | "gte" | "lt" | "lte";
export type ProofConstraint =
  | { kind: "condition"; expression: ProofExpression }
  | { kind: "comparison"; target: ProofTarget; operator: ProofComparison; value: ProofExpression }
  | { kind: "native"; target: ProofTarget; term: NativeProofTerm };

export interface ProofClaim {
  premises: readonly ProofConstraint[];
  assertions: readonly ProofConstraint[];
  proof?: NativeProofTerm;
}

export interface ProofModule {
  file: string;
  source: string;
}

export type ProofOutcome =
  | { status: "proved" }
  | { status: "disproved"; counterexample: Counterexample }
  | { status: "unproved" | "unsupported" | "error"; detail: string; diagnostic?: string };

/** The adapter has parsed the exact implementation snapshot and can certify claims about it. */
export interface PreparedProofAssistant {
  parameters: readonly { name: string; type: ProofType }[];
  result: ProofType;
  emit(claim: ProofClaim, modules: readonly ProofModule[]): string | Promise<string>;
  verify(claims: readonly ProofClaim[], modules: readonly ProofModule[]): Promise<readonly ProofOutcome[]>;
}

export interface ProofAssistant<Id extends string = string> {
  readonly id: Id;
  prepare(subject: SubjectSource): PreparedProofAssistant | Promise<PreparedProofAssistant>;
}
