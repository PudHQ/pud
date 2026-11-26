---
author: codex
date: 2026-11-24
updated-at: 2026-11-26
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

## Check ordinary numbers

Use `pud.number()` for an existing TypeScript `number` parameter. Motion’s original time conversion is an expression-bodied arrow, `(seconds: number) => seconds * 1000`. This sidecar proves the result is nonnegative for every nonnegative input, including negative zero and positive infinity. [Pinned Motion source](https://github.com/motiondivision/motion/blob/1fa0e141f7b3f0a4eea258d5debc7dfbe5af6ffc/packages/motion-utils/src/time-conversion.ts)

```ts
it("keeps every nonnegative duration nonnegative", { seconds: pud.number().gte(0) }, ({ seconds }) => {
  expect(secondsToMilliseconds(seconds)).to(pud.number().gte(0));
});
```

Run the two Motion sidecars and the currency example from the repository root.

```sh
bun run pud check --deny-cases packages/pud/.examples/motion packages/pud/.examples/cents.proof.ts
```

The six Motion laws cover unit scale, sign and reversal. Each conversion has one exact result rule that also accounts for NaN and signed zero. The currency sidecar specifies how to select a whole cent when a scaled amount falls between integers. [Time conversions](https://github.com/rorz/pud/tree/main/packages/pud/.examples/motion) · [Currency sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/cents.proof.ts)

## Specify a single result

Ask whether two different answers could both satisfy the rule for the same input. Use `.to()` for a guarantee such as “the price is nonnegative.” Use `.toExactly()` when a caller relies on a particular price. It accepts a schema for a number, bigint or boolean. Lean proves both that the implementation returns a permitted value and that this is the only permitted value.

```ts
it("returns the nearest whole cent, with half cents rounded toward positive infinity", {
  amount: pud.number(),
}, ({ amount }) => {
  expect(toCents(amount)).toExactly(pud.number().nearestIntegerTo(amount * 100, { ties: "up" }));
});
```

The input schema admits every JavaScript number. The result rule selects between the two neighboring integers around the binary64 product `amount * 100`. It chooses 13 for 12.5 cents and −12 for −12.5 cents. It preserves NaN, infinities and the sign of a zero result. A guard such as `given(Number.isInteger(amount * 100))` would remove all fractional-cent decisions from the claim. Numeric `.eq()` uses JavaScript strict equality. Use `.sameValue()` when the sign of zero or NaN is part of the required result. [Cents sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/cents.proof.ts) · [ECMAScript Number](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type)

With replay enabled, a failed exact rule can report two answers it permits for one input. A lower bound of `result >= x` for a bigint identity function permits both `0n` and `1n` at `x = 0n`. The same bound is a valid invariant. A result rule can also uniquely describe the wrong business policy. Pick a plausible mistake, such as reversing the tie direction, and check that the law rejects it. [Executable checks](https://github.com/rorz/pud/blob/main/packages/pud/test/number.test.ts)

Lean checks the claim against Pud’s binary64 model. Agreement with Bun is measured separately on boundary and seeded inputs. The model assumes primitive numbers and unmodified built-ins. Number arrays, coercion, exponentiation and remainder are outside this numeric fragment. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage#Checked number examples|Proofs, runtime comparisons and mutations]]

## Follow a call chain

The ZigZag roundtrip sidecar uses `describe(encode, …)` for its input signature and calls both TypeScript exports in its observation.

```ts
expect(decode(encode(value))).to(pud.bigint().eq(value));
```

Run `bun run --silent pud check packages/pud/.examples/zigzag-roundtrip.proof.ts`. The generated theorem includes both function bodies and quantifies over every signed bigint. Pud snapshots reachable module sources and rechecks their import resolutions.

Use `.to()` for a successful return and `expect(() => divide(numerator, divisor)).toThrow("RangeError")` for the exact class of a modeled throw. The division sidecar checks both cases. [Roundtrip sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/zigzag-roundtrip.proof.ts) · [Division sidecar](https://github.com/rorz/pud/blob/main/packages/pud/.examples/bigint-division.proof.ts) · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#What Pud implements|Implementation and conformance checks]]

For the supported bigint and boolean fragment, the generated unit also includes `loweringCertificate` and `sourceChecked`. The first equates the emitted observation to the modeled TypeScript source outcome. The second transfers the sidecar property to that source evaluation. [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Road to semantic preservation|Preservation proofs and the remaining trust boundary]]

## Compare a refactor with a reference

Use `toEqual()` when a nonthrowing number, bigint or boolean computation should agree with a simpler linked TypeScript call. The availability example compares the tally for a single scheduling slot against a reference that adds independent batch counts.

```ts
expect(countFree(left, right)).toEqual(countFreeReference(left, right));
```

Run `bun run --silent pud check packages/pud/.examples/availability/count-free.proof.ts`. Lean proves equality for the modeled dense bigint arrays. The same sidecar and lemmas also prove the split-and-merge implementation. [Availability example](https://github.com/rorz/pud/tree/main/packages/pud/.examples/availability)

With `leanAdapter({ replay: true })`, Pud can replay an open call equality or scalar result assertion in Bun. It checks the supported preconditions before calling the frozen implementation. Dropping the right batch yields `FAIL` for `left = []` and `right = [1n]`, with expected `1n` and received `0n`. A search with no witness leaves `UNPROVED`. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]] · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#Availability tally refactor|How the example was checked]]

## Prove a rule used in a transaction

Put a pure rule in a module the adapter can lower, then use that same function in the app and its proof sidecar. The booking example proves the seat decision, member price, and cancellation credit. Both verification paths run the same integration tests against Postgres to check that transactions write the right values, handle retries, and roll back after a write fails. [[First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking|Workshop booking comparison and runnable app]]

## Choose a proof or a test

Use a proof when you can state a precise rule that should hold for every input in the adapter’s model. Good first candidates are integer rounding, a codec roundtrip, or equality to an independent reference during a refactor. Check the preconditions against the values callers actually pass. Review the assertion with an example of an implementation that should fail. A quote that always charges zero satisfies a nonnegative-price bound, so the booking proof specifies the exact charge.

Use executable tests for concrete product examples and behavior you need to observe in the running system. A test can check the refund at a named policy boundary or read the persisted balance after cancellation. Tests also exercise the parts around a proved rule, such as converting inputs, the caller supplying the right arguments, and handling the return value. Keep those tests alongside the proof where the two checks answer different questions.

Start with the fast tests when you need feedback on an edit. Run the proof to check the whole modeled domain, particularly when a refactor should preserve the existing law. Read `PASS` against the stated claim and its input domain. Use the diagnostic when Pud reports `UNPROVED` or `UNSUPPORTED`. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]] · [[First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking#Where Pud has the clearest advantage|Measured trade-offs and checked examples]]
