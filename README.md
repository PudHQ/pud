# pud

`pud` checks a property of a TypeScript function for every input of its declared types. A developer reviews the property in TypeScript, an agent can write the Rocq proof, and CI replays it without an LLM.

## Try the demo

Install [Bun](https://bun.com/docs/installation) and [Rocq 9 with its standard library](https://rocq-prover.org/install). Put `rocq` on your PATH or set `ROCQ` to its executable. From the repository root run

```sh
bun install --frozen-lockfile
bun run demo
```

The [demo](packages/cli/demo/replay.ts) works in a temporary directory. It holds [the reviewed property](packages/cli/demo/bounds.proof.ts) fixed throughout.

| Change to `max` | Result |
| --- | --- |
| Original implementation, `a < b ? b : a` | `PASS`. Rocq checks the proof. |
| Equivalent implementation, `b < a ? a : b` | `UNPROVED`. The original proof splits on the old comparison. |
| Same implementation, [agent’s repaired proof](packages/cli/demo/repair/Maximum.v) | `PASS`. The same repair also checks against the original implementation. |
| Wrong implementation, `a < b ? a : b` | `DISPROVED`. Calling `max(0n, 1n)` returns `0n`, which violates the reviewed property. |

The repair was written by an agent given the failing proof and the generated theorem. The demo replays the saved repair locally. To check just the current files, use the same command on a laptop or in CI.

```sh
bun run --silent verify packages/cli/demo/bounds.proof.ts
```

## Write the property

Use a named value import in a `*.proof.ts` file. The predicate takes the function’s arguments in order and its result last. Here the final clause rules out returning a number larger than both inputs.

```ts
import { max } from "./bounds.ts";

export default {
  subject: max,
  property: (a: bigint, b: bigint, r: bigint) => r >= a && r >= b && (r === a || r === b),
  proof: "./Maximum.v",
  theorem: "max_correct",
};
```

A manifest can contain one definition or an array. Paths are relative to the manifest. The CLI parses it statically. To give a coding agent the generated model and exact theorem, run

```sh
bun run pud --emit packages/cli/demo/bounds.proof.ts max
```

Ask the agent to edit only `Maximum.v`, prove `Theorem max_correct : Subject.claim.`, and rerun verification. Emitting the claim works before the proof exists. If several properties target the same function, pass `max.max_correct` to select a theorem.

At verification time, Rocq compiles the generated model and the proof in a fresh directory. A separate module checks the named theorem against the generated claim and [audits its axioms](https://rocq-prover.org/doc/master/refman/proof-engine/vernacular-commands.html#print-assumptions). An admitted lemma or an unrelated theorem leaves the claim unproved. Native Rocq reference specs also work. The [minimum check](packages/cli/demo/Minimum.v) uses `spec: "minimum"` in place of `property` and proves agreement with `Z.min`.

## What the results mean

| Result | Meaning |
| --- | --- |
| `PASS` | Rocq checked the exact claim for all declared inputs with no additional global axioms. |
| `DISPROVED` | For a reviewed TS predicate, executing the validated function body and predicate on the JS runtime produced the displayed counterexample. |
| `UNPROVED` | The submitted proof did not establish the claim, or a reviewed property has no proof yet. |
| `ERROR` | Unsupported TypeScript, invalid input, or a tool error prevented verification. |

Witness search tries up to 256 argument combinations using small signed bigints and both booleans. It can miss bugs. If it finds no witness, verification continues to Rocq. Native Rocq reference specs have no JS predicate to replay. Exit `0` means every check passed, `1` means a claim was unproved or disproved, and `2` means an error occurred and takes precedence. Pass `--verbose` before the manifest for full Rocq diagnostics.

## Supported TypeScript

The verified function must be a named export with required `bigint` or `boolean` parameters and an explicit return type. It may use literals, `return`, `if/else`, ternaries, integer `+`, `-`, `*`, comparisons, boolean `!`, `&&`, `||`, and strict equality on like types. Reviewed predicates use the same expressions and must return a boolean.

The enclosing module may include literal constants, type-only declarations or imports, and unrelated named functions. Runtime imports, executable module initialization, calls or mutation in the verified function, loops and JS `number` are outside this fragment. Witness replay executes only the validated bodies. The proof relies on the translator faithfully modelling this fragment, callers supplying the stated types, and sufficient execution resources. Use trusted local Rocq scripts.

Run `bun run typecheck` and `bun run test` from the root. The [proof-replay workflow](.github/workflows/proofs.yml) runs the tests and demo without an agent. The [paired Rocq/Dafny experiment](experiments/prover-comparison/README.md) records what a behavior-preserving edit required from each prover.
