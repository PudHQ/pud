# pud

`pud` translates TypeScript functions to Rocq and checks agreement with a specification for **every input of the declared types**. Each [`*.proof.ts` file](packages/cli/demo/bounds.proof.ts) groups the proof definitions for its TypeScript module.

## Try it

Install [Bun](https://bun.com/docs/installation) and [Rocq 9 with its standard library](https://rocq-prover.org/install). Put `rocq` on your PATH, or set `ROCQ` to its executable. From the repository root:

```sh
bun install --frozen-lockfile
bun run --silent verify packages/cli/demo/bounds.proof.ts
```

Both checks pass. The [maximum proof](packages/cli/demo/Maximum.v) uses `Z.max`, and the [minimum proof](packages/cli/demo/Minimum.v) uses `Z.min`. To see a failure, swap the two return branches of `min` in [bounds.ts](packages/cli/demo/bounds.ts) and rerun. Only the minimum check fails.

Add `--verbose` before the manifest to see Rocq’s full diagnostic.

## Write a proof

```ts
// bounds.proof.ts
import { max, min } from "./bounds.ts";

export default [
  { subject: max, proof: "./Maximum.v", spec: "maximum", theorem: "max_correct" },
  { subject: min, proof: "./Minimum.v", spec: "minimum", theorem: "min_correct" },
];
```

Paths are relative to the manifest. Use named value imports and export an array of proof definitions, or a single object for one proof. The CLI reads these declarations without executing them. To inspect a generated model, select its local import name:

```sh
bun run pud --emit packages/cli/demo/bounds.proof.ts max
```

This prints the generated `Subject.v`, even before the proof exists. The name is optional for a file with one subject. The model defines `Subject.impl` from the function body and `Subject.agrees` from its signature. For `max`, the obligation is:

```coq
forall (a b : Z), Subject.impl a b = maximum a b
```

In your `.v` file, `From Pud Require Import Subject.`, define the reference function, and prove `Theorem max_correct : Subject.agrees maximum.` See [Maximum.v](packages/cli/demo/Maximum.v) for the complete proof. Keep the specification independent of `Subject.impl`: it defines what “correct” means.

On each check, the CLI compiles the model and the linked proof in a fresh temporary directory. It then asks Rocq to check the named theorem against the exact generated obligation and [report its assumptions](https://rocq-prover.org/doc/master/refman/proof-engine/vernacular-commands.html#print-assumptions). A theorem that relies on an axiom or `Admitted`, even indirectly, fails. A proof file may use the installed Rocq libraries; local multi-file Rocq projects are outside this PoC.

## Scope and results

The translator accepts named exported function declarations with required `bigint` or `boolean` parameters and an explicit return type. Bodies may use parameters, literals, `return`, `if/else`, ternaries, integer `+`, `-`, `*`, comparisons, and boolean `!`, `&&`, `||`. Equality uses `===` or `!==` on like types. Source modules may contain other named function declarations. Calls, mutation, loops, imports, `number` and other unsupported syntax are rejected.

The guarantee relies on the translator modeling this fragment correctly. It models `bigint` as mathematical integers and assumes callers supply the declared types and execution has sufficient resources. Use trusted local Rocq scripts.

Pass several manifests to check them in one run. Exit `0` means all passed; `1` means a proof was rejected (the claim may still be true); `2` means invalid input or a tool error and takes precedence. Diagnostics identify the manifest and the failing proof or source location.

The [CLI](packages/cli) lives in the Bun workspace under `packages/*`; `apps/*` is available for applications. Run `bun run typecheck` and `bun run test` from the root. The tests use the real Rocq compiler.

The existing local [Fibonacci walkthrough](examples/fibonacci/README.md) has its own Vitest, LemmaScript, Dafny, and Rocq examples.
