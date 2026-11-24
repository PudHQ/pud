---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Run the Lean prototype on a TypeScript search function and read the claim it checks.
tags: [verification, typescript, lean]
---
# Checking TypeScript with Lean

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud reads a TypeScript function and its `*.proof.ts` sidecar. Its Lean adapter generates the implementation and claim, then asks Lean to certify that claim. In the search example, the claim requires the index of the target’s first occurrence.

## Select Lean for a project

Put the following in `pud.config.ts`. Pud uses the closest config above each sidecar.

```ts
import { defineConfig } from "@pud/cli";
import { leanAdapter } from "@pud/cli/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
```

Portable suites import `describe`, `it`, and `pud` from `@pud/cli`. A matcher such as `pud.bigint().gte(0n)` states the same property regardless of which assistant is selected. When a suite supplies a Lean predicate or proof, import `pud` from `pud.config.ts` and call `pud.describe()`. The same import provides the schema builders, and TypeScript checks that native terms belong to the chosen assistant. [Authoring examples](https://github.com/rorz/pud/blob/main/packages/cli/README.md#configure-a-proof-assistant)

## Run the search proof

Run both commands from the repository root after `bun run setup`.

```sh
bun run --silent pud check packages/cli/experiments/lean/.examples/linear-search.proof.ts
bun run --silent pud --emit packages/cli/experiments/lean/.examples/linear-search.proof.ts
```

The first command reports one `PASS`. The second prints the file that defines `impl` and `claim` and supplies the proof. The source, sidecar, and `linear-search-lemmas.lean` live together in `packages/cli/experiments/lean/.examples/`.

## Read the three pieces

1. `linear-search.ts` loops over a `readonly bigint[]`, returns immediately on the first match, and returns `-1n` after exhausting the array. The generated `impl` uses a Lean `List Int`, an integer index, and an early return inside the loop.
2. `linear-search.proof.ts` declares the input schemas and asserts `LinearSearch.firstMatch` of the result. That predicate uses `List.findIdx?` as the reference search, with `-1` for an absent match. The generated claim quantifies over every list and target. For a list like `[7n, 3n, 7n]` and target `7n`, the first match is at index zero.
3. `linear-search-lemmas.lean` proves the loop agrees with that spec. The proof keeps the starting index arbitrary during induction because a recursive step scans the tail from the next index. The sidecar supplies `LinearSearch.correct`, which specialises the result to a starting index of zero.

The runner checks that the supplied theorem has the type of the emitted claim and audits its axiom dependencies. A `PASS` establishes the claim over the generated model. Connecting that claim to the TypeScript call depends on the lowering and the model’s input domain, here a dense array of bigints. An `UNPROVED` result carries the Lean diagnostic. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

The search example entered the suite alongside two other ports that exercise different parts of the translator. [[First Mate's Log/Verification/Lean/random-lemmascript-examples|What the LemmaScript ports exercised]] · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters|How the adapter boundary was tested]]
