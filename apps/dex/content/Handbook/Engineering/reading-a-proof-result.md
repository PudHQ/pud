---
author: codex
date: 2026-11-21
updated-at: 2026-11-24
summary: Read a Pud check, replay a concrete failure, and recognize when a refactor broke the proof.
aliases: [Replaying the maximum proof]
tags: [verification, cli, rocq, dafny]
---
# Reading a proof result

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

A `pud check` verdict belongs to one property in a `*.proof.ts` file. Start with the predicate. In the seat reservation example, `remaining <= available` rules out creating seats. The second property checks that a valid reservation consumes exactly the requested seats and a rejected one leaves the count alone. These checks catch different mistakes.

```sh
bun run --silent pud check --verbose packages/cli/demo/seats.proof.ts
```

Run this from a checkout with the workspace set up. It prints both properties and reports two passes. Use `--json` in place of `--verbose` for a report that a CI job can read. [Seat reservation sidecar](https://github.com/rorz/pud/blob/main/packages/cli/demo/seats.proof.ts)

| Result | What happened |
| --- | --- |
| `PASS` | The prover established the property in the generated model. Read the predicate and its assumptions to see what it covers. |
| `FAIL` | A run of the implementation violated the property. The report includes the input and observation. |
| `UNPROVED` | The claim is still open. Read the proof diagnostic and use the emitted model to see what the prover received. |
| `UNSUPPORTED` | Pud found a construct outside the selected model. The report points to the restriction. |
| `ERROR` | An input or tool error prevented the check. Read the diagnostic and rerun after addressing it. |

The exit status is `0` when all properties pass, `1` for an open or disproved claim, and `2` for unsupported input or an error. Exit `2` takes precedence in a mixed run.

## Replay the maximum proof

Run `bun run --silent demo:rocq` from the repository root with Rocq installed. The demo makes temporary copies of `max` and its linked proof. Each stage checks the same predicate.

```ts
(a, b, r) => r >= a && r >= b && (r === a || r === b)
```

| Demo stage | Evidence |
| --- | --- |
| Original `a < b ? b : a` | `PASS`. The saved Rocq proof checks. |
| Equivalent `b < a ? a : b` | `UNPROVED`. The original proof splits on the old comparison. |
| Equivalent implementation with the repaired proof | `PASS`. Rocq accepts the repair against the same property. |
| Faulty `a < b ? a : b` | `FAIL`. Replay observes `max(0n, 1n)` returning `0n`, so `r >= b` is false. |

For a failure, start with the reported call and identify the predicate clause it breaks. For an open proof after a refactor, inspect the generated claim and the proof step that failed. `bun run --silent pud --emit packages/cli/demo/bounds.proof.ts max` prints the Rocq unit for the checkout’s current implementation. [Replay script](https://github.com/rorz/pud/blob/main/packages/cli/demo/replay.ts) · [Reviewed property](https://github.com/rorz/pud/blob/main/packages/cli/demo/bounds.proof.ts)

For Dafny’s contract vocabulary, see the reference manual. To inspect the model and claim for the separate Lean prototype, follow the linear-search example. [[Bookmarks/dafny-reference-manual|Dafny reference manual]] · [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]
