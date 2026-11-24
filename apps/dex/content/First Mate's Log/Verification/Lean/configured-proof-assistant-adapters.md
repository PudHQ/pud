---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: How Pud shares schema-based claims across proof assistants while checking the types of native proof terms.
tags: [verification, typescript, lean, adapters]
---
# Configured proof assistant adapters

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The starting point was a Lean demo whose schema names, sidecar parser, and proof runner all belonged to the same assistant. The configured API uses Pud schemas and passes their premises and result constraints to a `ProofAssistant`. Its `prepare` method receives the named export's source snapshot and returns the signature, emitter, and verifier. The adapter still owns the semantics of the TypeScript constructs it admits. [Adapter contract](https://github.com/rorz/pud/blob/main/packages/model/src/assistant.ts)

Project config is selected relative to each sidecar. Native suites import the config as `pud` and use that binding for both `pud.describe()` and schema builders such as `pud.bigint()` and `pud.boolean()`. The primitive names follow TypeScript and Zod. The configured binding gives both the schemas and proof helpers the type of the chosen assistant. Pud reads the sidecar statically and checks the same assistant marker when a library call supplies an explicit adapter. The configured import and native tagged template follow Drizzle's driver and query patterns. [Zod schemas](https://zod.dev/api#primitives) · [Drizzle setup](https://orm.drizzle.team/docs/get-started/postgresql-new) · [Drizzle tagged templates](https://orm.drizzle.team/docs/sql)

The Lean adapter checks the theorem type against the currently emitted claim and audits its dependencies. The migrated examples certified 23 active properties and reported one TODO. A temporary change from `+ 1n` to `+ 2n` caused the original increment proof to fail. A term using `sorry` failed the axiom audit. An independent test adapter received the portable claim from a suite, and Pud rejected that suite's Lean predicate and named certificate for the alternate adapter. The installed package typecheck caught the native type mismatch too.

The next assistant needs to implement the same prepared-subject interface for the types and expressions it supports. Rocq already has a linked-proof workflow in Pud. A configured Rocq adapter can reuse its pure translation for overlapping constructs and will need its own handling for the neutral suite constraints and native proof terms. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]] · [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]
