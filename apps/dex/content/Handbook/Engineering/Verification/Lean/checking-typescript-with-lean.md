---
author: codex
date: 2026-11-24
updated-at: 2026-11-25
summary: Run the Lean adapter, read a quantified claim, and follow it across TypeScript calls.
tags: [verification, typescript, lean, quantifiers, call-graphs, exceptions]
---
# Checking TypeScript with Lean

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud reads a TypeScript function and its `*.proof.ts` sidecar. Its Lean adapter generates the implementation and claim, then asks Lean to certify that claim. In the search example, the claim requires the index of the target’s first occurrence.

## Select Lean for a project

Lean is Pud’s first bundled adapter. Select it in `pud.config.ts`. Pud uses the closest config above each sidecar, and the portable suite API stays the same when a project selects another adapter.

```ts
import { defineConfig } from "@pud.dev/lib";
import { leanAdapter } from "@pud.dev/lib/lean";

const pud = defineConfig({ adapter: leanAdapter() });

export default pud;
```

Portable suites import `describe`, `it`, and `pud` from `@pud.dev/lib`. A matcher such as `pud.bigint().gte(0n)` states the same property regardless of which assistant is selected. When a suite supplies a Lean predicate or proof, import `pud` from `pud.config.ts` and call `pud.describe()`. The same import provides the schema builders, and TypeScript checks that native terms belong to the chosen assistant. [Authoring examples](https://github.com/rorz/pud/blob/main/packages/pud/README.md#configure-a-proof-assistant)

## Run the search proof

Run both commands from the repository root after `bun run setup`.

```sh
bun run --silent pud check packages/pud/.examples/linear-search.proof.ts
bun run --silent pud --emit packages/pud/.examples/linear-search.proof.ts
```

The first command reports one `PASS`. The second prints the file that defines `impl` and `claim` and supplies the proof. The source, sidecar, and `linear-search-lemmas.lean` live together in `packages/pud/.examples/`.

## Read the three pieces

1. `linear-search.ts` loops over a `readonly bigint[]`, returns immediately on the first match, and returns `-1n` after exhausting the array. The generated `impl` uses a Lean `List Int`, an integer index, and an early return inside the loop.
2. `linear-search.proof.ts` declares the input schemas and asserts `LinearSearch.firstMatch` of the result. That predicate uses `List.findIdx?` as the reference search, with `-1` for an absent match. The generated claim quantifies over every list and target. For a list like `[7n, 3n, 7n]` and target `7n`, the first match is at index zero.
3. `linear-search-lemmas.lean` proves the loop agrees with that spec. The proof keeps the starting index arbitrary during induction because a recursive step scans the tail from the next index. The sidecar supplies `LinearSearch.correct`, which specialises the result to a starting index of zero.

The runner checks that the supplied theorem has the type of the emitted claim and audits its axiom dependencies. A `PASS` establishes the claim over the generated model. Connecting that claim to the TypeScript call depends on the lowering and the model’s input domain, here a dense array of bigints. An `UNPROVED` result carries the Lean diagnostic. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

The search example entered the suite alongside two other ports that exercise different parts of the translator. [[First Mate's Log/Verification/Lean/random-lemmascript-examples|What the LemmaScript ports exercised]] · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Calls, exceptions, and termination|How Pud, LemmaScript, and Lynx model execution]]

## State a quantified property

The membership sidecar uses a refinement to say when its boolean result is true.

```ts
expect(arrayContains(values, target)).to(pud.boolean().refine(found =>
  pud.iff(found, pud.exists(values, value => value === target)),
));
```

Pud emits a Lean `∃` over elements equal to the target and restricts its witness to members of `values`. The checker certifies both directions of the equivalence for every modeled input array and target. The induction lemma lives in the neighboring Lean file and is checked at that claim type. [Membership sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/array-contains.proof.ts) · [Membership lemma](https://github.com/rorz/pud/blob/main/packages/pud/.examples/array-contains-lemmas.lean)

Use `pud.forall` to require a predicate of every array element. Both quantifiers also take a scalar schema such as `pud.bigint().gte(0n)`. Its constraints guard the binder. Inspect a generated claim with `bun run --silent pud --emit packages/pud/.examples/array-contains.proof.ts`. [Sidecar syntax](https://github.com/rorz/pud/blob/main/packages/pud/.examples/README.md#sidecar-syntax)

## Follow a call chain

The ZigZag roundtrip sidecar uses `describe(encode, …)` for its input signature and calls both TypeScript exports in its observation.

```ts
expect(decode(encode(value))).to(pud.bigint().eq(value));
```

Run `bun run --silent pud check packages/pud/.examples/zigzag-roundtrip.proof.ts`. The generated theorem includes both function bodies and quantifies over every signed bigint. Pud snapshots reachable module sources and rechecks their import resolutions.

Use `.to()` for a successful return and `expect(() => divide(numerator, divisor)).toThrow("RangeError")` for the exact class of a modeled throw. The division sidecar checks both cases. [Roundtrip sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/zigzag-roundtrip.proof.ts) · [Division sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/bigint-division.proof.ts) · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#What Pud implements|Implementation and conformance checks]]

For the supported scalar fragment, the generated unit also includes `loweringCertificate` and `sourceChecked`. The first equates the emitted observation to the modeled TypeScript source outcome. The second transfers the sidecar property to that source evaluation. [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Road to semantic preservation|Preservation proofs and the remaining trust boundary]]

## Compare a refactor with a reference

Use `toEqual()` when a nonthrowing bigint or boolean computation should agree with a simpler linked TypeScript call. The availability example compares the tally for a single scheduling slot against a reference that adds independent batch counts.

```ts
expect(countFree(left, right)).toEqual(countFreeReference(left, right));
```

Run `bun run --silent pud check packages/pud/.examples/availability/count-free.proof.ts`. Lean proves equality for the modeled dense bigint arrays. The same sidecar and lemmas also prove the split-and-merge implementation. [Availability example](https://github.com/rorz/pud/tree/main/packages/pud/.examples/availability)

With `leanAdapter({ replay: true })`, Pud samples unconditional call equalities over supported inputs when Lean leaves a claim open. It runs both calls against frozen TypeScript sources with the resolved imports in Bun. Dropping the right batch yields `FAIL` for `left = []` and `right = [1n]`, with expected `1n` and received `0n`. A search with no witness leaves `UNPROVED`. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]] · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Availability tally refactor|How the example was checked]]

## Prove a rule used in a transaction

Put a pure rule in a module the adapter can lower, then use that same function in the app and its proof sidecar. The booking example proves the seat decision, member price, and cancellation credit. Both verification paths run the same integration tests against Postgres to check that transactions write the right values, handle retries, and roll back after a write fails. [[First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking|Workshop booking comparison and runnable app]]

## Choose a proof or a test

Use a proof when you can state a precise rule that should hold for every input in the adapter’s model. Good first candidates are integer rounding, a codec roundtrip, or equality to an independent reference during a refactor. Check the preconditions against the values callers actually pass. Review the assertion with an example of an implementation that should fail. A quote that always charges zero satisfies a nonnegative-price bound, so the booking proof specifies the exact charge.

Use executable tests for concrete product examples and behavior you need to observe in the running system. A test can check the refund at a named policy boundary or read the persisted balance after cancellation. Tests also exercise the parts around a proved rule, such as converting inputs, the caller supplying the right arguments, and handling the return value. Keep those tests alongside the proof where the two checks answer different questions.

Start with the fast tests when you need feedback on an edit. Run the proof to check the whole modeled domain, particularly when a refactor should preserve the existing law. Read `PASS` against the stated claim and its input domain. Use the diagnostic when Pud reports `UNPROVED` or `UNSUPPORTED`. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]] · [[First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking#Where Pud has the clearest advantage|Measured trade-offs and checked examples]]
