# TypeScript proofs with Lean

A `*.proof.ts` suite describes an imported TypeScript export. Pud reads the suite and implementation as source. The Lean adapter generates the implementation and claim in Lean and asks it to certify the claim. Input schemas set the quantified domain. Matcher chains state what the result must satisfy for every input in that domain. [Configure a proof assistant](../../README.md#configure-a-proof-assistant)

## Run the examples

Run `bun run setup` from the repository root. If the Bun dependencies are already installed, `bun run setup:lean` installs just Elan and Lean. The demo finds the checkout’s Elan shim in `.cache/elan` and uses the version in [lean-toolchain](lean-toolchain). `PUD_LEAN` can select a standalone Lean executable.

```sh
bun run demo:lean
bun run pud check packages/cli/experiments/lean/.examples
```

In a terminal, the report groups properties by file and shows timings, verdicts, and the source location of any Lean diagnostic. Set `NO_COLOR=1` for monochrome output. Piped output uses plain status rows and a run summary.

To use `lean` directly in your current macOS or Linux shell, run this from the repository root.

```sh
export ELAN_HOME="$PWD/.cache/elan"
export PATH="$ELAN_HOME/bin:$PATH"
lean --version
```

| Style | Implementation | Sidecar |
| --- | --- | --- |
| Functional | [Clamp](.examples/clamp.ts) | [Ordered bounds and chained assertions](.examples/clamp.proof.ts) |
| Functional | [Export quota](.examples/admit.ts) | [Batch bounds and boolean equality](.examples/admit.proof.ts) |
| Imperative | [Balance debit](.examples/debit.ts) | [Local mutation, a branch, and an exact debit](.examples/debit.proof.ts) |
| Imperative | [Sum positive values](.examples/sum-positive.ts) | [A loop, a named Lean proof, and a TODO](.examples/sum-positive.proof.ts) |
| Functional | [Parity](.examples/iff.ts) | [Evenness](.examples/is-even.proof.ts) · [Matching parity](.examples/same-parity.proof.ts) |
| Imperative | [Linear search](.examples/linear-search.ts) | [First match with an early return](.examples/linear-search.proof.ts) |
| Functional | [Content dispatch](.examples/content-dispatch.ts) | [Narrowing text or parts with `Array.isArray`](.examples/content-dispatch.proof.ts) |
| Imperative | [Array sum](.examples/array-sum.ts) | [Exact sum](.examples/array-sum.proof.ts) |
| Imperative | [Array membership](.examples/array-contains.ts) | [Membership with `break`](.examples/array-contains.proof.ts) |
| Imperative | [Sortedness](.examples/is-sorted.ts) | [Nondecreasing adjacent pairs](.examples/is-sorted.proof.ts) |
| Imperative | [Maximum element](.examples/max-element.ts) | [List maximum with an empty-list default](.examples/max-element.proof.ts) |
| Imperative | [Nested loops](.examples/nested-loop-invariants.ts) | [One visit per ordered pair](.examples/nested-loop-invariants.proof.ts) |
| Imperative | [Count odd elements](.examples/for-continue.ts) | [Skipping even values with `continue`](.examples/for-continue.proof.ts) |
| Functional | [Integer maximum](.examples/math-min-max-int.ts) | [Greatest of three inputs](.examples/math-min-max-int.proof.ts) |
| Functional | [ZigZag encoding](.examples/zigzag.ts) | [Encode a signed integer](.examples/zigzag-encode.proof.ts) · [Decode a nonnegative code](.examples/zigzag-decode.proof.ts) |
| Functional | [Wide bigint operations](.examples/bigint-bits.ts) | [70-bit left shift](.examples/shift-wide.proof.ts) · [Low 64 bits](.examples/low-64.proof.ts) |
| Functional | [Truthiness](.examples/truthiness.ts) | [Boolean condition](.examples/boolean-truthiness.proof.ts) · [Bigint condition](.examples/bigint-truthiness.proof.ts) |

Parity, linear search, and content dispatch were adapted from a random draw of LemmaScript’s TypeScript examples. The parity and search ports use `bigint`. Search uses `for…of` and exits at the first match. Content dispatch retains its text-or-parts input and treats each part as an opaque element in Lean. [Upstream examples](https://github.com/midspiral/LemmaScript/tree/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples) · [LemmaScript license](.examples/lemmascript-license.txt)

The ten follow-up ports use exact `bigint` arithmetic and `for…of` for array traversal. Sortedness accepts the empty list. Maximum element returns zero for the empty list. The nested-loop example uses the array length as its iteration count, and the scalar maximum uses bigint comparisons. The two ZigZag sidecars check their exports against the same signed-integer-to-code relation.

Pass a sidecar path to check it individually. Use `--emit` to inspect the generated Lean, with a property title when the suite has several active properties. The hidden `.examples` directory makes this set opt-in during repository-wide discovery. The project config selects Lean for the examples when using `pud`. [Example configuration](pud.config.ts)

```sh
bun run pud --emit packages/cli/experiments/lean/.examples/clamp.proof.ts
```

## Sidecar syntax

`describe(exportedFunction, callback)` binds the suite to the named TS import. Each `it` declares one schema per parameter and calls the export with those inputs in parameter order. `expect(result).to(pud.bigint().gte(lower).lte(upper))` adds the conjunction `lower ≤ result ∧ result ≤ upper`. Calls to `given` add cross-input constraints before the assertions.

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
| `it.todo(title)` | A reported TODO with zero proof obligations |

`pud.int()` and `pud.bool()` are aliases for `pud.bigint()` and `pud.boolean()`.

Quantifier domains can be bound `readonly bigint[]` values or `pud.bigint()` and `pud.boolean()` schemas with optional constraints. Each callback is a unary arrow with an expression or a single return. Write ordinary scalar comparisons inside it and use the Pud connectives to combine symbolic predicates. Both refinements and `given()` accept symbolic predicates. [Membership example](.examples/array-contains.proof.ts) · [Maximum example](.examples/max-element.proof.ts)

Specifications can use `pud.length(values)` for a bigint count of elements or `pud.sum(values)` for the sum of a bigint array. `pud.modulo(value, divisor)` expresses the nonnegative residue for a positive bigint literal divisor. [Array sum](.examples/array-sum.proof.ts) · [Parity](.examples/is-even.proof.ts)

Import `pud` from `pud.config.ts` to use native predicates or proofs in `pud.describe()`. Use `.satisfies(lean.ref("Namespace.predicate", ...args))` to apply a named Lean predicate to the explicit arguments followed by the value under assertion. A `lean` tagged template can build the same predicate and interpolate in-scope TypeScript expressions. [Native template example](../../README.md#use-native-proof-code)

Register local Lean definitions and lemmas with `use(lean.module("./helper.lean"))`. A definition marked `@[simp]` is available to the automatic simplifier. Use `it(...).by(lean.ref("Namespace.theorem"))` or a tagged `by` term when supplying a certificate. Lean checks it against the exact generated claim. [Induction lemma example](.examples/array-sum-lemmas.lean)

## What a pass establishes

The generated claim quantifies over the declared inputs and applies the matcher to the result of the generated implementation. Scalar expressions reuse Pud’s TypeScript reader. Lean `Id.run do` represents local assignment, branching, and early returns. A `for…of` loop with a single bigint accumulator assignment lowers to `List.foldl`. Other `for…of` loops use Lean’s `for` over a list, including unlabelled `break` and `continue`.

The runner applies Lean simplification, case splits, and integer arithmetic to active properties unless they provide a proof term. A fresh Lean module checks the resulting certificate against the generated claim and audits its axiom dependencies. An open goal, a mismatched theorem, or a dependency on `sorryAx` fails the command. The runner checks that the sidecar, implementation, and local Lean modules still match the files it read before reporting a pass. [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

The subject fragment includes synchronous scalar arithmetic and booleans, initialized locals, `if`, and `for…of` over ordinary dense `readonly bigint[]`. An `if` condition can be a boolean or a bigint, with zero treated as false. A block-bodied subject has a final return. For `string | readonly T[]`, one locally declared interface supplies the opaque element type. The unshadowed `Array.isArray` built-in narrows the array branch, and the model represents the text branch as `none`. The guarantee relies on the TS-to-Lean lowering and the displayed input domain. Lean escape hatches run as trusted local Lean code.

Bigint division and remainder take positive literal divisors and lower to `Int.tdiv` and `Int.tmod`, which truncate toward zero. A nonnegative literal shift count lowers to multiplication by a power of two. AND with a literal mask of consecutive low bits lowers to the nonnegative residue modulo the mask plus one, including for negative inputs. [ECMAScript bigint operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-bigint-type)
