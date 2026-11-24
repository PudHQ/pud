---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Portable schema refinements, Lean proof reuse, and what Lynx shows about source-linked laws.
tags: [verification, typescript, lean, adapters, quantifiers, lynx]
---
# Configured proof assistant adapters

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The starting point was a Lean demo whose schema names, sidecar parser, and proof runner all belonged to the same assistant. The configured API uses Pud schemas and passes their premises and result constraints to a `ProofAssistant`. Its `prepare` method receives the named export's source snapshot and returns the signature, emitter, and verifier. The adapter still owns the semantics of the TypeScript constructs it admits. [Adapter contract](https://github.com/rorz/pud/blob/main/packages/model/src/assistant.ts)

Project config is selected relative to each sidecar. Native suites import the config as `pud` and use that binding for both `pud.describe()` and schema builders such as `pud.bigint()` and `pud.boolean()`. The primitive names follow TypeScript and Zod. The configured binding gives both the schemas and proof helpers the type of the chosen assistant. Pud reads the sidecar statically and checks the same assistant marker when a library call supplies an explicit adapter. The configured import and native tagged template follow Drizzle's driver and query patterns. [Zod schemas](https://zod.dev/api#primitives) · [Drizzle setup](https://orm.drizzle.team/docs/get-started/postgresql-new) · [Drizzle tagged templates](https://orm.drizzle.team/docs/sql)

The Lean adapter checks the theorem type against the currently emitted claim and audits its dependencies. The migrated examples certified 23 active properties and reported one TODO. A temporary change from `+ 1n` to `+ 2n` caused the original increment proof to fail. A term using `sorry` failed the axiom audit. An independent test adapter received the portable claim from a suite, and Pud rejected that suite's Lean predicate and named certificate for the alternate adapter. The installed package typecheck caught the native type mismatch too.

## Refinements and quantifiers

The demo had 22 inline Lean templates across 15 sidecars, with 13 predicates and nine certificates. Zod-style `.refine()` now accepts predicates over result and input values, and the adapter contract represents quantifiers and connectives directly. Lean lowers a universal domain constraint to an implication and an existential one to a conjunction. An array domain uses list membership. The generated claim and the standalone axiom check use the same proposition. [Zod refinements](https://zod.dev/api#refinements) · [Lean quantifiers](https://lean-lang.org/doc/reference/latest/Basic-Propositions/Quantifiers/)

On Lean 4.19.0, the revised examples certify 23 properties and report one TODO with zero inline templates. Eleven predicates moved to Pud and two became named Lean definitions. Definitional equality, simplification after case splits, and standard division and remainder lemmas replace eight inline proofs. The fold proof remains available as a named induction lemma. Changing the membership implementation from equality to inequality caused the named theorem to fail at the generated claim type. [Demo sources](https://github.com/rorz/pud/tree/main/packages/cli/experiments/lean/.examples)

## Comparison with Lynx

Lynx also translates a host-language law and its subject into Lean, then checks the theorem and its axiom dependencies. Lynx starts from compiled BEAM modules, translates their Core Erlang and reachable calls, and models successful returns, exceptions, and execution effects. Its generated law fixture requires the expectation to evaluate to `Except.ok Lynx.Term.true`. Its after-translation declarations can refer to the generated program, and `LYNX_EXPORT` supports replay with independent Lean checkers. [Lynx README](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/README.md) · [Translator](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/lib/lynx/translation.ex#L82-L129) · [Generated law](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/test/fixtures/translations/sum.Erlang.sum.laws.lean)

Pud currently checks one export at a time with a restricted source translator. A useful next test is a single ZigZag roundtrip law over both imported TypeScript exports. It would exercise call-graph translation and bind one claim to both implementations. Comparing generated programs with Bun for every newly admitted construct would help test the translation boundary. [Lynx law patterns](https://github.com/josevalim/lynx/blob/49928b1f94687cc38dee81490d5301008cfc22f9/README.md#getting-started-with-proofs)

The next assistant needs to implement the same prepared-subject interface for the types and expressions it supports. Rocq already has a linked-proof workflow in Pud. A configured Rocq adapter can reuse its pure translation for overlapping constructs and will need its own handling for the neutral suite constraints and native proof terms. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]] · [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]
