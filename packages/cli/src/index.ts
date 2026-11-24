export { check, checkFiles, emit, type CheckOptions, type CheckReport, type CheckResult, type EmitOptions } from "./check.ts";
export { proof } from "./proof.ts";
export { defineConfig, describe, expect, given, it, native, pud, type PudConfig, type NativeModule, type NativeSyntax, type NativeTerm, type Proposition, type Schema } from "./suite-authoring.ts";
export type { Counterexample, DomainAdapter, PreparedSubject, ProofBackend, ReviewedProperty, SubjectSource } from "@pud/model/adapter";
export type { NativeProofTerm, PreparedProofAssistant, ProofAssistant, ProofCall, ProofClaim, ProofComparison, ProofConstraint, ProofErrorKind, ProofExpression, ProofModule, ProofOutcome, ProofPredicate, ProofTarget, ProofType } from "@pud/model/assistant";
export { Unsupported } from "@pud/model/adapter";
