# Check an availability tally across a refactor

A group scheduler needs the same availability count whether it reads participant batches in one pass or counts the batches independently and adds the totals. Quorum's LemmaScript case study proves this property for scheduling data. Lynx uses the same law for list sums and shows how to compare an implementation with a reference in a law. [Quorum aggregation](https://github.com/midspiral/quorum-lemmascript/blob/main/src/domain.ts#L58-L77) · [Lynx laws](https://github.com/josevalim/lynx#examples)

This example focuses on one time slot. Each element represents a participant's bigint availability mask. Its low bit records availability for the slot, so `1n` and `3n` contribute one and `0n` and `2n` contribute zero. The inputs are ordinary dense bigint arrays. The sidecar compares the tally to an independently defined TypeScript reference for every pair of modeled lists. [Sidecar](count-free.proof.ts) · [Reference](count-free-reference.ts)

```sh
bun run --silent pud.dev check packages/pud/.examples/availability/count-free.proof.ts
bun run --silent pud.dev --emit packages/pud/.examples/availability/count-free.proof.ts
```

Lean uses `List.foldl_append` and proves that adding an initial total shifts the result by that total. The supporting lemma connects JavaScript's low-bit operation to the reference's explicit yes-or-no vote. [Lean lemmas](count-free-lemmas.lean)

Run the regression from the repository root to exercise the same sidecar with three implementations. The test makes its edits in a temporary copy and invokes the `pud.dev` command for each version.

```sh
bun test packages/pud/test/lean.test.ts -t 'the same availability law'
```

| Implementation | Result |
| --- | --- |
| One accumulator scans the two batches | `PASS` |
| Two batch tallies are added in reverse order | `PASS` with the same sidecar and Lean lemmas |
| The right batch is dropped | `FAIL` with `left = []`, `right = [1n]`, expected `1n`, received `0n` |

The example enables `leanAdapter({ replay: true })`. Lean certifies the model on both passing versions. For the dropped batch, Pud executes the exact frozen implementation and reference in Bun to obtain the witness.
