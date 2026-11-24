---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Where an early scan of Pud exports stopped, and what a signed division check exposed.
tags: [verification, typescript, lean, conformance-testing, coverage]
---
# Measuring TypeScript-to-Lean coverage

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

We wanted a baseline for how much of Pud’s own code the Lean prototype could translate. The demo at the time certified six properties and reported one TODO. A separate scan sent 142 direct named exports through `lowerSubject`. Zero lowered. Module validation rejected 83 before the translator reached their function bodies.

The scan covered 95 `.ts` and `.tsx` files under `apps/*/app`, `apps/*/src`, and `packages/*/src`. It selected exported function declarations and `const` arrows, skipping declaration files, tests, sidecars, and generated folders. The later run on 24 November reported ten certified properties and one TODO across eight demo sidecars, adding the LemmaScript work to the curated suite. [[First Mate's Log/Verification/Lean/random-lemmascript-examples|What the LemmaScript ports exercised]]

## Check the edge cases before counting an operator

The division probes used Bun 1.4.2 and Lean 4.19.0. Bun returned `-2n` for `-5n / 2n`. Lean’s `Int` division gave `-3` and `Int.tdiv (-5) 2` gave `-2`. Bun threw `RangeError` for `1n / 0n`, while Lean integer division gave `0`. A future lowering needs to preserve truncation toward zero and represent the throw at zero. [ECMAScript BigInt division](https://tc39.es/ecma262/#sec-numeric-types-bigint-divide) · [Lean integers](https://lean-lang.org/doc/reference/latest/Basic-Types/Integers/)

## What to measure next

Rerun the same export selector on a pinned corpus and record the first blocker per export. For a language rule, record whether source lowers and whether the Lean output agrees with native execution on returns and throws. Pin the compiler options and runtime for that comparison. Compiler tests can exercise TypeScript syntax and emit, and Test262 can supply cases for JavaScript behavior. [TypeScript compiler tests](https://github.com/microsoft/typescript-go/blob/main/.github/skills/compiler-and-fourslash-tests/SKILL.md) · [Test262](https://github.com/tc39/test262#goals--state-of-test262)

A translation correctness proof would connect the generated Lean model to the observable JavaScript behavior under explicit assumptions. The search guide shows the claim that Pud certifies today. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]
