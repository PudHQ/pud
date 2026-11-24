---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Thirteen LemmaScript ports exercised union narrowing, loop control, and signed bigint operations in Pud’s Lean frontend.
tags: [verification, typescript, lean, lemmascript, coverage]
---
# Porting LemmaScript examples to Lean

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

## Initial draw

We drew three of LemmaScript’s top-level TypeScript examples to see which constructs would get in the way of porting unfamiliar code. After setting aside clamp, which Pud already had, the pool contained 90 files. The draws without replacement were zero-based indices 33, 39, and 19 in the shrinking, lexicographically sorted list. [Pinned LemmaScript examples](https://github.com/midspiral/LemmaScript/tree/966272f70ea708ba8d84e95bafa610c3e2b8a1d3/examples)

| Example | What the port checks |
| --- | --- |
| `iff.ts` | Evenness and parity equivalence on nonnegative inputs. The port uses `bigint`. Remainder by a positive literal lowers to Lean’s `Int.tmod`. |
| `linearSearch.ts` | The first matching index or `-1n` on an ordinary dense bigint array. The port uses `for…of` with an early return and checks against `List.findIdx?` in Lean. |
| `contentDispatch.ts` | The input’s parts in order, or an empty list for text. The frontend lowers `Array.isArray` to a branch on `Option (List Item)` and leaves part values opaque. |

Lean 4.19.0 certified the four properties. In temporary copies, changing either parity predicate, the search index increment, or the dispatch result broke the corresponding proof. Separate Bun checks exercised duplicate matches, an absent target, large bigints, and both dispatch branches. The frontend rejected a zero remainder divisor and a shadowed `Array` binding.

The ports exposed three choices the model had to make. Parity needs the sign rules of JavaScript remainder. Search needs an early return from a loop. Dispatch can preserve the sequence of parts while leaving their fields opaque, because the claim only asks which sequence comes back.

## Ten follow-up ports

The follow-up selected six array and loop examples and four scalar examples from the same revision. The loop properties cover exact sums, membership, sortedness, maxima, the number of ordered pairs, and the number of odd values. The scalar properties cover the greatest of three inputs, both directions of the ZigZag relation, two wide bit operations, and boolean and bigint conditions. [Runnable example index](https://github.com/rorz/pud/blob/main/packages/cli/experiments/lean/README.md#run-the-examples)

The ports use exact bigint arithmetic and traverse dense read-only arrays with `for…of`. Sortedness accepts the empty array, maximum element returns zero for it, and the nested-loop port uses the array length as its iteration count.

The examples distinguish two kinds of remainder. Odd counting tests whether JavaScript’s truncated remainder is zero, which agrees with Lean’s Euclidean remainder on divisibility even for negative values. Extracting the low bits requires the nonnegative Euclidean residue. At `-1n`, the low 64 bits are all ones. Literal division uses Lean’s `Int.tdiv`, which gives `-3` for `-7 / 2` and matches bigint division. A separate check confirmed that `break` and `continue` both acted on the inner loop in the generated Lean. [ECMAScript bigint operations](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-bigint-type)

Lean 4.19.0 certified all 13 new properties. For each property, a behavioral change to a temporary copy of the TypeScript implementation caused a proof failure with the same sidecar and Lean lemmas. Separate Bun checks exercised the implementations with empty lists, duplicate values, negatives, and bigints wider than 64 bits.

Run `bun run --silent demo:lean` from the repository root to recheck the ports. The Handbook walks through the search proof, and the coverage log records the scan of Pud’s code. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]] · [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|Measuring TypeScript-to-Lean coverage]]
