---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: What the Lean adapter admits, where it stops, and how to measure coverage of runtime behavior.
tags: [verification, typescript, lean, conformance-testing, coverage, effects]
---
# Measuring TypeScript-to-Lean coverage

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

We wanted a baseline for how much of Pud’s own code the Lean prototype could translate. The demo at the time certified six properties and reported one TODO. A separate scan sent 142 direct named exports through `lowerSubject`. Zero lowered. Module validation rejected 83 before the translator reached their function bodies.

The scan covered 95 `.ts` and `.tsx` files under `apps/*/app`, `apps/*/src`, and `packages/*/src`. It selected exported function declarations and `const` arrows, skipping declaration files, tests, sidecars, and generated folders. The later run on 24 November reported ten certified properties and one TODO across eight demo sidecars, adding the LemmaScript work to the curated suite. [[First Mate's Log/Verification/Lean/random-lemmascript-examples|What the LemmaScript ports exercised]]

## What the current adapter admits

A fresh scan used Bun 1.4.2 and the working tree based on `47a7255`. It selected 187 direct named function declarations and exported `const` arrows from 114 files in the same source directories. It passed each candidate to the Lean adapter's `lowerProgram` with relative module resolution. Zero lowered. These counts measure the first rejection on the repo corpus.

| First rejection | Exports |
| --- | ---: |
| Import or module initialization | 122 |
| JSX syntax outside the adapter parser | 38 |
| Unsupported parameter or return type | 24 |
| Async, generator, or generic restriction | 3 |

Small standalone probes reached the body checker. A local bigint assignment lowered. `console.log`, array indexing, `.reduce`, and `try/finally` were rejected. Separate signatures using `number`, an object argument, and an `async` return also failed. The curated demo's 32 active proofs show what works inside the supported fragment. [Program linker](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/program.ts) · [Subject lowering](https://github.com/rorz/pud/blob/main/packages/cli/src/lean/subject.ts)

## Use logging to exercise external calls

An external call contract can state what the call may return or throw, which state it may change, and whether it must finish. A logging contract must apply to the actual binding in the chosen runtime. The Console Standard leaves printing behavior to the implementation. Arguments still evaluate in JavaScript order, including any throws. [Console printing](https://console.spec.whatwg.org/#printer) · [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]

Pud's `.to(...)` requires a successful return and a matching value. A contract that permits a log to throw introduces a possible exceptional outcome. Callers can establish normal return from a stronger contract or a handler, and a property about successful returns can state its result bound conditionally. A test should cover both allowed outcomes, as well as rejection of a logger with an unknown contract.

## Check the edge cases before counting an operator

The division probes used Bun 1.4.2 and Lean 4.19.0. Bun returned `-2n` for `-5n / 2n`. Lean’s `Int` division gave `-3` and `Int.tdiv (-5) 2` gave `-2`. Bun threw `RangeError` for `1n / 0n`, while Lean integer division gave `0`. Pud now lowers signed division to `Int.tdiv` and returns an explicit error outcome when the divisor is zero. The differential suite compares returns and throws as well as call and loop behavior on the same input in Bun and Lean. [ECMAScript BigInt division](https://tc39.es/ecma262/#sec-numeric-types-bigint-divide) · [Lean integers](https://lean-lang.org/doc/reference/latest/Basic-Types/Integers/) · [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters#What Pud implements|Hardening results]]

## What to measure next

The coverage map lists the language, runtime, and proof obligations, with indexed traversal as an end-to-end example. [[First Mate's Log/Verification/Lean/Language Coverage/typescript-to-lean-coverage-map|TypeScript-to-Lean coverage map]]

Rerun the same export selector on a pinned corpus and record the first blocker per export. For a language rule, record whether source lowers and whether the Lean output agrees with native execution on returns and throws. Pin the compiler options and runtime for that comparison. Compiler tests can exercise TypeScript syntax and emit, and Test262 can supply cases for JavaScript behavior. [TypeScript compiler tests](https://github.com/microsoft/typescript-go/blob/main/.github/skills/compiler-and-fourslash-tests/SKILL.md) · [Test262](https://github.com/tc39/test262#goals--state-of-test262)

A translation correctness proof would connect the generated Lean model to the observable JavaScript behavior under explicit assumptions. The search guide shows the claim that Pud certifies today. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]
