# TypeScript proofs with Lean

A `*.proof.ts` suite describes an imported TypeScript export. Bun reads the suite and the implementation as source, generates the Lean implementation and claim, and asks Lean to certify that claim. Input schemas set the quantified domain. Matcher chains state what the result must satisfy for every input in that domain.

## Run the examples

Run `bun run setup` from the repository root. If the Bun dependencies are already installed, `bun run setup:lean` installs just Elan and Lean. The demo finds the checkout’s Elan shim in `.cache/elan` and uses the version in [lean-toolchain](lean-toolchain). `PUD_LEAN` can select a standalone Lean executable.

```sh
bun run demo:lean
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
| Functional | [Export quota](.examples/admit.ts) | [Boolean assertions and an inline Lean predicate](.examples/admit.proof.ts) |
| Imperative | [Balance debit](.examples/debit.ts) | [Local mutation, a branch, and an exact debit](.examples/debit.proof.ts) |
| Imperative | [Sum positive values](.examples/sum-positive.ts) | [A loop, a named Lean proof, and a TODO](.examples/sum-positive.proof.ts) |
| Functional | [Parity](.examples/iff.ts) | [Evenness](.examples/is-even.proof.ts) · [Matching parity](.examples/same-parity.proof.ts) |
| Imperative | [Linear search](.examples/linear-search.ts) | [First match with an early return](.examples/linear-search.proof.ts) |
| Functional | [Content dispatch](.examples/content-dispatch.ts) | [Narrowing text or parts with `Array.isArray`](.examples/content-dispatch.proof.ts) |

Parity, linear search, and content dispatch were adapted from a random draw of LemmaScript’s TypeScript examples. The parity and search ports use `bigint`. Search uses `for…of` and exits at the first match. Content dispatch retains its text-or-parts input and treats each part as an opaque element in Lean. [Upstream examples](https://github.com/midspiral/LemmaScript/tree/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples) · [LemmaScript license](.examples/lemmascript-license.txt)

Pass a sidecar path to check it individually. Use `--emit` to inspect the generated Lean, with a property title when the suite has several active properties. The `.examples` directory keeps these suites out of discovery by the current Dafny and Rocq CLI.

```sh
bun run demo:lean --emit packages/cli/experiments/lean/.examples/clamp.proof.ts
```

## Sidecar syntax

`describe(exportedFunction, callback)` binds the suite to the named TS import. Each `it` declares one schema per parameter and calls the export with those inputs in parameter order. `expect(result).to(lean.int().gte(lower).lte(upper))` adds the conjunction `lower ≤ result ∧ result ≤ upper`. Calls to `given` add cross-input constraints before the assertions.

| Sidecar | Lean |
| --- | --- |
| `lean.int()`, `lean.bool()`, `lean.array(lean.int())` | `Int`, `Bool`, `List Int` |
| `lean.array(lean.opaque<T>())`, `lean.textOrArray(lean.opaque<T>())` | `List Item`, `Option (List Item)` for an opaque element type |
| Integer `.eq`, `.gt`, `.gte`, `.lt`, `.lte` | `=`, `>`, `≥`, `<`, `≤` |
| Boolean `.eq` | Boolean equality |
| `given(predicate)` | An additional premise |
| `it.todo(title)` | A reported TODO with zero proof obligations |

`.satisfies(lean.ref("Namespace.predicate", ...args))` applies a named Lean predicate to the explicit arguments followed by the value under assertion. `.satisfies(lean.inline("fun … => …", ...args))` works the same way with a literal Lean term. `lean.use("./helper.lean")` adds a local Lean module. `it(...).by(lean.ref("Namespace.theorem"))` or `it(...).by(lean.inline("by …"))` supplies a term of the exact generated claim type.

## What a pass establishes

The generated claim quantifies over the declared inputs and applies the matcher to the result of the generated implementation. Scalar expressions reuse Pud’s TypeScript reader. Lean `Id.run do` represents local assignment, branching, and early returns. A `for…of` loop with a single bigint accumulator assignment lowers to `List.foldl`. Loops with branching and early return use Lean’s `for` over a list.

The runner applies Lean simplification, case splits, and integer arithmetic to active properties unless they provide a proof term. A fresh Lean module checks the resulting certificate against the generated claim and audits its axiom dependencies. An open goal, a mismatched theorem, or a dependency on `sorryAx` fails the command. The runner checks that the sidecar, implementation, and local Lean modules still match the files it read before reporting a pass. [Lean proof validation](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

The subject fragment includes synchronous scalar arithmetic and booleans, initialized locals, `if`, and `for…of` over ordinary dense `readonly bigint[]`. Bigint remainder uses `Int.tmod` and requires a positive literal divisor. A block-bodied subject has a final return. For `string | readonly T[]`, one locally declared interface supplies the opaque element type. The unshadowed `Array.isArray` built-in narrows the array branch, and the model represents the text branch as `none`. The guarantee relies on the TS-to-Lean lowering and the displayed input domain. Lean escape hatches run as trusted local Lean code.
