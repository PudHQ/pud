# TypeScript proofs with Lean

A `*.proof.ts` suite describes an imported TypeScript export. Pud reads the suite and the linked implementations as source. The Lean adapter generates the implementation and claim in Lean and asks it to certify the claim. Input schemas set the quantified domain. A property states the required return or exception for every input in that domain. [Configure a proof assistant](../README.md#configure-a-proof-assistant)

## Run the examples

Run `bun run setup` from the repository root. If the Bun dependencies are already installed, `bun run setup:lean` installs just Elan and Lean. Pud finds the checkout’s Elan shim in `.cache/elan` and uses the version in [lean-toolchain](lean-toolchain). `PUD_LEAN` can select a standalone Lean executable.

```sh
bun run pud check packages/pud/.examples/linear-search.proof.ts
bun run pud check packages/pud/.examples
```

The first command checks the search proof. The full directory includes the indexed `for` loop in `sum-positive.ts`, which currently reports `UNSUPPORTED` and makes the run exit with status 2.

In a terminal, the live panel highlights the running property, its timer, and total elapsed time. The trail uses evenly spaced dots and groups checks when the queue outgrows the terminal. The final report groups properties by file and shows timings, verdicts, and diagnostic source locations. Set `NO_COLOR=1` for monochrome output. Redirected output uses plain status rows and a run summary.

To use `lean` directly in your current macOS or Linux shell, run this from the repository root.

```sh
export ELAN_HOME="$PWD/.cache/elan"
export PATH="$ELAN_HOME/bin:$PATH"
lean --version
```

| Style | Implementation | Sidecar |
| --- | --- | --- |
| Functional | [Clamp](clamp.ts) | [Ordered bounds and chained assertions](clamp.proof.ts) |
| Functional | [Export quota](admit.ts) | [Batch bounds and boolean equality](admit.proof.ts) |
| Imperative | [Balance debit](debit.ts) | [Local mutation, a branch, and an exact debit](debit.proof.ts) |
| Imperative | [Sum positive values](sum-positive.ts) | [A loop, a named Lean proof, and a TODO](sum-positive.proof.ts) |
| Functional | [Parity](iff.ts) | [Evenness](is-even.proof.ts) · [Matching parity](same-parity.proof.ts) |
| Imperative | [Linear search](linear-search.ts) | [First match with an early return](linear-search.proof.ts) |
| Functional | [Content dispatch](content-dispatch.ts) | [Narrowing text or parts with `Array.isArray`](content-dispatch.proof.ts) |
| Imperative | [Array sum](array-sum.ts) | [Exact sum](array-sum.proof.ts) |
| Imperative | [Availability tally](availability/README.md) | [Equality to a reference tally across batches](availability/count-free.proof.ts) |
| Imperative | [Array membership](array-contains.ts) | [Membership with `break`](array-contains.proof.ts) |
| Imperative | [Sortedness](is-sorted.ts) | [Nondecreasing adjacent pairs](is-sorted.proof.ts) |
| Imperative | [Maximum element](max-element.ts) | [List maximum with an empty-list default](max-element.proof.ts) |
| Imperative | [Nested loops](nested-loop-invariants.ts) | [One visit per ordered pair](nested-loop-invariants.proof.ts) |
| Imperative | [Count odd elements](for-continue.ts) | [Skipping even values with `continue`](for-continue.proof.ts) |
| Functional | [Integer maximum](math-min-max-int.ts) | [Greatest of three inputs](math-min-max-int.proof.ts) |
| Functional | [ZigZag encoding](zigzag.ts) | [Encode a signed integer](zigzag-encode.proof.ts) · [Decode a nonnegative code](zigzag-decode.proof.ts) · [Prove the composed roundtrip](zigzag-roundtrip.proof.ts) |
| Functional | [Wide bigint operations](bigint-bits.ts) | [70-bit left shift](shift-wide.proof.ts) · [Low 64 bits](low-64.proof.ts) |
| Functional | [Truthiness](truthiness.ts) | [Boolean condition](boolean-truthiness.proof.ts) · [Bigint condition](bigint-truthiness.proof.ts) |
| Functional | [Bigint division](bigint-division.ts) | [Signed quotient and zero-divisor exception](bigint-division.proof.ts) |
| Imperative | [Safe quotient](safe-quotient.ts) | [Catch a throw from an imported function](safe-quotient.proof.ts) |
| Imperative | [Countdown and recursion](termination.ts) | [Decreasing while loop](countdown-sum.proof.ts) · [Decreasing recursive call](recursive-sum.proof.ts) |

Parity, linear search, and content dispatch were adapted from a random draw of LemmaScript’s TypeScript examples. The parity and search ports use `bigint`. Search uses `for…of` and exits at the first match. Content dispatch retains its text-or-parts input and treats each part as an opaque element in Lean. [Upstream examples](https://github.com/midspiral/LemmaScript/tree/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples) · [LemmaScript license](lemmascript-license.txt)

The ten follow-up ports use exact `bigint` arithmetic and `for…of` for array traversal. Sortedness accepts the empty list. Maximum element returns zero for the empty list. The nested-loop example uses the array length as its iteration count, and the scalar maximum uses bigint comparisons. The two ZigZag sidecars check their exports against the same signed-integer-to-code relation.

Pass a sidecar path to check it individually. Use `--emit` to inspect the generated Lean, with a property title when the suite has several active properties. The hidden `.examples` directory makes this set opt-in during repository-wide discovery. The project config selects Lean for the examples when using `pud`. [Example configuration](pud.config.ts)

```sh
bun run pud --emit packages/pud/.examples/clamp.proof.ts
```

## Sidecar syntax

`describe(exportedFunction, callback)` binds the suite's input signature to the named TS import. Each `it` declares one schema per parameter. A direct observation calls the export with those inputs in parameter order. A composed observation can nest named imported calls, using the declared inputs as leaves and calling the suite's export somewhere in the expression. `expect(result).to(pud.bigint().gte(lower).lte(upper))` requires a successful return satisfying the conjunction `lower ≤ result ∧ result ≤ upper`. Calls to `given` add cross-input constraints before the assertions. [Composed observation](zigzag-roundtrip.proof.ts)

| Sidecar | Lean |
| --- | --- |
| `pud.bigint()`, `pud.boolean()`, `pud.array(pud.bigint())` | `Int`, `Bool`, `List Int` |
| `pud.array(pud.opaque<T>())`, `pud.textOrArray(pud.opaque<T>())` | `List Item`, `Option (List Item)` for an opaque element type |
| Integer `.eq`, `.gt`, `.gte`, `.lt`, `.lte` | `=`, `>`, `≥`, `<`, `≤` |
| Boolean `.eq` | Boolean equality |
| `.refine(value => predicate)` | A proposition about the input or result |
| `given(predicate)` | An additional premise |
| `pud.forall(domain, value => predicate)` | Universal quantification with the domain as a premise |
| `pud.exists(domain, value => predicate)` | Existential quantification with the domain as a conjunct |
| `pud.and`, `pud.or`, `pud.not`, `pud.implies`, `pud.iff` | `∧`, `∨`, `¬`, `→`, `↔` |
| `expect(call()).toEqual(reference())` | Equality of two successful scalar results |
| `expect(() => call()).toThrow("RangeError")` | Equality to the modeled `Except.error` outcome |
| `it.todo(title)` | A reported TODO with zero proof obligations |

`pud.int()` and `pud.bool()` are aliases for `pud.bigint()` and `pud.boolean()`.

Quantifier domains can be bound `readonly bigint[]` values or `pud.bigint()` and `pud.boolean()` schemas with optional constraints. Each callback is a unary arrow with an expression or a single return. Write ordinary scalar comparisons inside it and use the Pud connectives to combine symbolic predicates. Both refinements and `given()` accept symbolic predicates. [Membership example](array-contains.proof.ts) · [Maximum example](max-element.proof.ts)

Specifications can use `pud.length(values)` for a bigint count of elements or `pud.sum(values)` for the sum of a bigint array. `pud.modulo(value, divisor)` expresses the nonnegative residue for a positive bigint literal divisor. `pud.quotient(n, d)` is a mathematical truncating quotient with value zero at `d = 0`. Use it under a nonzero precondition when specifying JavaScript division, and use `.toThrow()` for the zero case. [Array sum](array-sum.proof.ts) · [Parity](is-even.proof.ts) · [Division](bigint-division.proof.ts)

Import `pud` from `pud.config.ts` to use native predicates or proofs in `pud.describe()`. Use `.satisfies(lean.ref("Namespace.predicate", ...args))` to apply a named Lean predicate to the explicit arguments followed by the value under assertion. A `lean` tagged template can build the same predicate and interpolate in-scope TypeScript expressions. [Native template example](../README.md#use-native-proof-code)

Register local Lean definitions and lemmas with `use(lean.module("./helper.lean"))`. A definition marked `@[simp]` is available to the automatic simplifier. Use `it(...).by(lean.ref("Namespace.theorem"))` or a tagged `by` term when supplying a certificate. Lean checks it against the exact generated claim. [Induction lemma example](array-sum-lemmas.lean)

## What a pass establishes

The generated claim quantifies over the declared inputs and applies the matcher to the generated implementation's outcome. The adapter links direct calls to same-file functions and relative named TypeScript imports with inert initialization. Module-level executable effects, cyclic imports, mutually recursive functions, and dynamic calls are outside this fragment. Pud rechecks the linked sources and import resolutions before reporting a pass.

Lean `Id.run do` represents pure local assignment, branching, and early returns. A `for…of` loop with a single pure bigint accumulator assignment lowers to `List.foldl`. Other supported `for…of` loops use Lean’s `for` over a list, including unlabelled `break` and `continue`. A `while` loop may use `counter > literal` or `counter >= literal` and end each iteration with `counter -= positiveLiteral`. Lean proves that its distance to the bound decreases. Direct pure self-recursion uses the first bigint parameter's `.toNat` as its measure, and Lean checks each recursive call. [Countdown and recursion](termination.ts) · [Lean recursion](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)

The runner applies Lean simplification, case splits, and integer arithmetic to active properties unless they provide a proof term. A fresh Lean module checks the resulting certificate against the generated claim and audits its axiom dependencies. An open goal, a mismatched theorem, or a dependency on `sorryAx` fails the command. The runner checks that the sidecar, implementation, and local Lean modules still match the files it read before reporting a pass. [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

The subject fragment includes synchronous scalar arithmetic and booleans, initialized locals, `if`, and `for…of` over ordinary dense `readonly bigint[]`. An `if` condition can be a boolean or a bigint, with zero treated as false. The final statement of a block-bodied subject must return or throw on every path. For `string | readonly T[]`, one locally declared interface supplies the opaque element type. The unshadowed `Array.isArray` built-in narrows the array branch, and the model represents the text branch as `none`. The guarantee relies on the TS-to-Lean lowering and the displayed input domain. Lean escape hatches run as trusted local Lean code.

Bigint division and remainder use `Int.tdiv` and `Int.tmod` for nonzero divisors. A zero divisor produces `Except.error .rangeError`. The adapter also models explicit throws of unshadowed `Error`, `RangeError`, and `TypeError`, with the class as the observed payload. It sequences fallible expressions left to right, evaluates short-circuit branches lazily, and supports `try { return expression } catch { … }` with an unbound catch and no `finally`. [ECMAScript bigint operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-bigint-type) · [Catch example](safe-quotient.ts)

A nonnegative literal shift count lowers to multiplication by a power of two. AND with a literal mask of consecutive low bits lowers to the nonnegative residue modulo the mask plus one, including for negative inputs. Run the differential suite with `bun test packages/pud/test/lean.test.ts` after `bun run setup:lean`. It compares generated Lean functions with Bun on signed inputs, large integers, exception paths, short-circuiting, and loops. The model assumes standard builtins and ignores runtime resource limits such as stack exhaustion. [Conformance tests](../test/lean.test.ts)

## Inspect the lowering proof

For the scalar fragment, Pud builds a source expression from the frozen TypeScript AST and verifies that its evaluator agrees with the emitted implementation on every modeled input. The fragment includes bigint and boolean expressions, local bindings and assignments, branches, direct acyclic calls, and modeled throws and catches. The artifact includes `loweringCertificate` for outcome equality and `sourceChecked` for the sidecar property transferred to source evaluation.

```sh
bun run --silent pud --emit packages/pud/.examples/zigzag-roundtrip.proof.ts
```

The countdown and dense-array fold helpers have their own proofs against execution relations. A property that uses a helper still relies on the translation of its loop body and state. A general guarantee also needs a correctness argument for reifying the TypeScript AST and for the model's relation to JavaScript execution. [Scalar semantics](../src/lean/scalar.lean) · [Iteration semantics](../src/lean/iteration.lean)
