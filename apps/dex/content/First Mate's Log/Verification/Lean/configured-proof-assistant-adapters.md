---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Portable claims and how Pud, LemmaScript, and Lynx model calls, exceptions, and termination.
tags: [verification, typescript, lean, adapters, quantifiers, call-graphs, exceptions, termination, lemmascript, lynx]
---
# Configured proof assistant adapters

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The starting point was a Lean demo whose schema names, sidecar parser, and proof runner all belonged to the same assistant. The configured API uses Pud schemas and passes their premises and result constraints to a `ProofAssistant`. Its `prepare` method receives the named export's source snapshot and returns the signature, emitter, and verifier. The adapter still owns the semantics of the TypeScript constructs it admits. [Adapter contract](https://github.com/rorz/pud/blob/main/packages/model/src/assistant.ts)

Project config is selected relative to each sidecar. Native suites import the config as `pud` and use that binding for both `pud.describe()` and schema builders such as `pud.bigint()` and `pud.boolean()`. The primitive names follow TypeScript and Zod. The configured binding gives both the schemas and proof helpers the type of the chosen assistant. Pud reads the sidecar statically and checks the same assistant marker when a library call supplies an explicit adapter. The configured import and native tagged template follow Drizzle's driver and query patterns. [Zod schemas](https://zod.dev/api#primitives) · [Drizzle setup](https://orm.drizzle.team/docs/get-started/postgresql-new) · [Drizzle tagged templates](https://orm.drizzle.team/docs/sql)

The Lean adapter checks the theorem type against the currently emitted claim and audits its dependencies. The migrated examples certified 23 active properties and reported one TODO. A temporary change from `+ 1n` to `+ 2n` caused the original increment proof to fail. A term using `sorry` failed the axiom audit. An independent test adapter received the portable claim from a suite, and Pud rejected that suite's Lean predicate and named certificate for the alternate adapter. The installed package typecheck caught the native type mismatch too.

## Refinements and quantifiers

The demo had 22 inline Lean templates across 15 sidecars, with 13 predicates and nine certificates. Zod-style `.refine()` now accepts predicates over result and input values, and the adapter contract represents quantifiers and connectives directly. Lean lowers a universal domain constraint to an implication and an existential one to a conjunction. An array domain uses list membership. The generated claim and the standalone axiom check use the same proposition. [Zod refinements](https://zod.dev/api#refinements) · [Lean quantifiers](https://lean-lang.org/doc/reference/latest/Basic-Propositions/Quantifiers/)

On Lean 4.19.0, the revised examples certify 23 properties and report one TODO with zero inline templates. Eleven predicates moved to Pud and two became named Lean definitions. Definitional equality, simplification after case splits, and standard division and remainder lemmas replace eight inline proofs. The fold proof remains available as a named induction lemma. Changing the membership implementation from equality to inequality caused the named theorem to fail at the generated claim type. [Demo sources](https://github.com/rorz/pud/tree/main/packages/cli/experiments/lean/.examples)

## Calls, exceptions, and termination

### The original Lean model

Pud initially bound a sidecar to one named TypeScript export and translated its body to a Lean function. The claim applied that generated function to every input admitted by the sidecar. For example, the array sum translates `bigint` to `Int` and the accumulator loop to `List.foldl` over a finite `List Int`. Its generated claim reduces to `∀ values : List Int, impl values = values.sum`. The standalone Lean audit checks the certificate at that claim type and checks its axiom dependencies. Pud rechecks the input snapshots before reporting the verdict. [Subject lowering](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/subject.ts) · [Lean checker](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/index.ts) · [Snapshot checks](https://github.com/rorz/pud/blob/main/packages/cli/src/check.ts)

At that stage, same-file calls, imported calls, recursion, `throw`, and `while` were unsupported, and bigint division accepted only positive literal divisors. The Bun probes returned `-2n` for `-5n / 2n` and threw `RangeError` for `1n / 0n`. The lowering needed to preserve both outcomes. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|TypeScript coverage and runtime probes]] · [Bigint division in ECMAScript](https://tc39.es/ecma262/#sec-numeric-types-bigint-divide)

### What LemmaScript models

LemmaScript generates Lean and Velvet 2 implementations from TypeScript and its inline contracts. Its `conditionalCalls` example generates the callee and caller, with a call's precondition checked on the branch that invokes it. Its binary search uses Velvet's total-correctness mode, with loop invariants and the decreasing measure `(hi - lo + 1).toNat`. Pure recursive definitions use Lean's termination checking. [Conditional call model](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples/conditionalCalls.def.lean) · [Binary search model](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples/binarySearch.def.lean#L17-L46) · [Lean backend specification](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/SPEC_LEAN.md#31-pure-function-mirrors)

For cross-file calls, the frontend resolves the symbol and scans for further externs. The Lean backend emits an opaque function and, when there is a contract, an axiom for that contract. A caller proof then depends on the callee satisfying the declared contract. The compiler translates `throw` to an assertion of false, so the proof must establish that the throw is unreachable under the method's preconditions. The exception payload is outside that model. [Extern discovery](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/extract.ts#L70-L103) · [Lean extern emitter](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/lean-emit.ts#L844-L868) · [Throw lowering](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/transform.ts#L1924-L1925)

### What Lynx models

Lynx recovers Core Erlang from compiled BEAM debug information and follows supported reachable callees, including calls across modules. [Core Erlang extraction](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/lib/lynx/translation.ex#L353-L361) · [Call translation](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/lib/lynx/translation.ex#L242-L275)

Pure computations produce an `Except` outcome. The exception model includes handlers, with a distinct exhaustion outcome that handlers propagate. In the generated sum example, the law must evaluate to `Except.ok Lynx.Term.true`. A throw or an exhausted computation cannot satisfy that goal. Lynx supports termination arguments and partial fixpoints for recursive functions. [Exception model](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/Lean/Lynx/Term/Except.lean#L5-L42) · [Generated law](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/test/fixtures/translations/sum.Erlang.sum.laws.lean#L10-L21) · [Lynx features](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/README.md#features)

### What Pud implements

1. **Link direct calls.** Pud follows same-file calls and relative named imports from modules with inert initialization. The ZigZag sidecar proves `decode(encode(x)) === x` against both generated bodies. Changing either body made the same proof fail. A separate test edits a transitive dependency or changes its import resolution during a check and verifies that Pud invalidates the verdict. [ZigZag sidecar](https://github.com/rorz/pud/blob/main/packages/cli/experiments/lean/.examples/zigzag-roundtrip.proof.ts)
2. **Represent observable throws.** Bigint division and remainder use `Except` when the divisor can be zero. Calls preserve the order of throws, and a restricted `try/catch` can recover from one. A return property requires `.ok` and an exception property requires the specified error class. The division example proves the signed return and zero-divisor throw over all numerators. [Division sidecar](https://github.com/rorz/pud/blob/main/packages/cli/experiments/lean/.examples/bigint-division.proof.ts)
3. **Check termination in Lean.** The supported while form subtracts a positive literal and uses the distance to its lower bound as a measure. Pure direct recursion uses the first bigint parameter's `.toNat`. Lean checks the decrease for all inputs to the generated definition. The demo separately checks a base case and a positive result. Reversing the loop or recursion step prevents a pass. [Termination examples](https://github.com/rorz/pud/blob/main/packages/cli/experiments/lean/.examples/termination.ts) · [Lean recursion reference](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)
4. **Compare with Bun.** The regression suite compared 280 return or exception outcomes on Bun 1.4.2 and Lean 4.19.0. It exercises signed arithmetic and zero divisors, call ordering, short circuits, a catch, loops with multiple mutable locals, and recursion. The remaining general guarantee requires a correspondence proof against explicit JavaScript semantics for the admitted fragment. [Conformance tests](https://github.com/rorz/pud/blob/main/packages/cli/test/lean.test.ts) · [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|Coverage measurements]]

The standalone sketch below shows the division model before its integration into the adapter. Here the zero-divisor tag represents the runtime's `RangeError`. The compiler generalizes the same return and throw distinction to expressions and call chains.

```lean
import Std

inductive DivisionError where
  | zeroDivisor

def divide (n d : Int) : Except DivisionError Int :=
  if d = 0 then .error .zeroDivisor else .ok (Int.tdiv n d)

example (n : Int) : divide n 0 = .error .zeroDivisor := by simp [divide]

example (n d : Int) (nonzero : d ≠ 0) :
    divide n d = .ok (Int.tdiv n d) := by simp [divide, nonzero]

example : divide (-5) 2 = .ok (-2) := by rfl
```

## Other adapters

The next assistant needs to implement the same prepared-subject interface for the types and expressions it supports. Rocq already has a linked-proof workflow in Pud. A configured Rocq adapter can reuse its pure translation for overlapping constructs and will need its own handling for the neutral suite constraints and native proof terms. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]] · [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]
