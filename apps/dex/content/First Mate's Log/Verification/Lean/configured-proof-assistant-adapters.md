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

### What Pud checks today

Pud binds a sidecar to one named TypeScript export and translates its body to a Lean function. The claim applies that generated function to every input admitted by the sidecar. For example, the array sum translates `bigint` to `Int` and the accumulator loop to `List.foldl` over a finite `List Int`. Its generated claim reduces to `∀ values : List Int, impl values = values.sum`. The standalone Lean audit checks the certificate at that claim type and checks its axiom dependencies. Pud rechecks the input snapshots before reporting the verdict. [Subject lowering](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/subject.ts) · [Lean checker](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/index.ts) · [Snapshot checks](https://github.com/rorz/pud/blob/main/packages/cli/src/check.ts)

Finite traversal gives the modeled loop its termination. I checked that the array sum passes on Lean 4.19.0, and that a same-file helper call, an imported helper, recursion, `throw`, and `while` each report `UNSUPPORTED`. Bigint division accepts a positive literal divisor and uses `Int.tdiv` to preserve truncation toward zero. Bun 1.4.2 returned `-2n` for `-5n / 2n` and threw `RangeError` for `1n / 0n`. A Lean proof certifies the generated function. Its application to Bun depends on the translation preserving the behavior of the admitted source, including assumptions such as dense arrays with standard iteration. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|TypeScript coverage and runtime probes]] · [Bigint division in ECMAScript](https://tc39.es/ecma262/#sec-numeric-types-bigint-divide)

### What LemmaScript models

LemmaScript generates Lean and Velvet 2 implementations from TypeScript and its inline contracts. Its `conditionalCalls` example generates the callee and caller, with a call's precondition checked on the branch that invokes it. Its binary search uses Velvet's total-correctness mode, with loop invariants and the decreasing measure `(hi - lo + 1).toNat`. Pure recursive definitions use Lean's termination checking. [Conditional call model](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples/conditionalCalls.def.lean) · [Binary search model](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples/binarySearch.def.lean#L17-L46) · [Lean backend specification](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/SPEC_LEAN.md#31-pure-function-mirrors)

For cross-file calls, the frontend resolves the symbol and scans for further externs. The Lean backend emits an opaque function and, when there is a contract, an axiom for that contract. A caller proof then depends on the callee satisfying the declared contract. The compiler translates `throw` to an assertion of false, so the proof must establish that the throw is unreachable under the method's preconditions. The exception payload is outside that model. [Extern discovery](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/extract.ts#L70-L103) · [Lean extern emitter](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/lean-emit.ts#L844-L868) · [Throw lowering](https://github.com/midspiral/LemmaScript/blob/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/tools/src/transform.ts#L1924-L1925)

### What Lynx models

Lynx recovers Core Erlang from compiled BEAM debug information and follows supported reachable callees, including calls across modules. [Core Erlang extraction](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/lib/lynx/translation.ex#L353-L361) · [Call translation](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/lib/lynx/translation.ex#L242-L275)

Pure computations produce an `Except` outcome. The exception model includes handlers, with a distinct exhaustion outcome that handlers propagate. In the generated sum example, the law must evaluate to `Except.ok Lynx.Term.true`. A throw or an exhausted computation cannot satisfy that goal. Lynx supports termination arguments and partial fixpoints for recursive functions. [Exception model](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/Lean/Lynx/Term/Except.lean#L5-L42) · [Generated law](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/test/fixtures/translations/sum.Erlang.sum.laws.lean#L10-L21) · [Lynx features](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/README.md#features)

### How Pud could extend the model

1. **Link direct calls.** Start with an acyclic call graph. Resolve each call to its source definition and emit reachable bodies as Lean definitions. Snapshot every dependency and recheck import resolution and file contents before reporting success. Start with same-file calls, then admit imports whose initialization and binding behavior Pud can model. Use `decode(encode(x)) === x` as the first law that names two source bindings. Check that a behavior-breaking edit to either body invalidates the same claim. [ZigZag source](https://github.com/rorz/pud/blob/main/packages/cli/experiments/lean/.examples/zigzag.ts)
2. **Represent observable throws.** Model a terminating computation as `Except ErrorKind Result` for supported throws. Variable-divisor bigint division is a small first case. Require the result to be `.ok (Int.tdiv n d)` for `d ≠ 0` and `.error .zeroDivisor` for `d = 0`, corresponding to Bun's `RangeError`. Preserve operand evaluation order and propagate exceptions across calls. When admitting a catch, model which throws reach its handler and the payload it can inspect.
3. **Prove termination when admitting loops and recursion.** Use structural recursion when each call takes a substructure such as the tail of a list. For a general loop or recursive call, prove that a well-founded measure decreases on every continuing step. Carry any precondition used by that proof into the modeled domain. If the model later allows divergence, use an evaluation relation and require a successful terminating execution explicitly. An implication about the returned value alone can hold when no return occurs. [Lean recursion reference](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)
4. **Test the translation against Bun.** For each newly admitted construct, execute the same cases in Bun and the generated Lean model. Compare values and throws, with fixtures for short-circuiting and signed arithmetic. These tests catch mismatches on observed executions. A general guarantee would require a correspondence proof against explicit JavaScript semantics for the admitted fragment. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|Conformance testing]]

The standalone division model checks in Lean 4.19.0. It proves the return and throw cases and checks signed truncation on the Bun probe.

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
