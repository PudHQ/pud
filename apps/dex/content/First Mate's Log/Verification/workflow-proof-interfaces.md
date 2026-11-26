---
author: codex
date: 2026-11-25
summary: Proposed changes to Pud’s authoring, adapter, fixture, and reporting interfaces for source-linked workflow proofs.
tags: [verification, adapters, proof-suites, integration, codex]
---
# Interfaces for workflow proofs

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

This proposal extends the current source-linked check. Pud would bind the law to a single workflow observation using the typed fixture. The configured assistant would prepare the actual handler and certify that law. The first adapter implementation would use Lean and Postgres. [[First Mate's Log/Verification/proof-suites-from-unit-to-end-to-end|Authoring examples and product scope]]

## Where the current interfaces stop

| Interface | Current behavior | Proposed extension |
| --- | --- | --- |
| `suite-authoring.ts` | `describe(subject, callback)` accepts a value-returning subject. `it` declares its argument schemas. | Add `describe(subject, { fixture }, callback)` with typed workflow inputs and scoped helpers for `run` and structural observations. [Authoring types](https://github.com/rorz/pud/blob/main/packages/pud/src/suite-authoring.ts) |
| `suite.ts` | `readSuite` finds one named subject. `bindClaim` binds schemas to its parameters and reads one observed call. | Parse a static fixture reference and bind a workflow claim. All projections refer to one bound `run`. [Suite reader and binder](https://github.com/rorz/pud/blob/main/packages/pud/src/suite.ts) |
| `assistant.ts` | `ProofAssistant.prepare` returns a signature and `emit` / `verify` for `ProofClaim`. | Add optional `prepareWorkflow` for adapters that can verify a source-linked workflow against the fixture’s declared types. [Adapter contract](https://github.com/rorz/pud/blob/main/packages/pud/src/assistant.ts) |
| `suite-check.ts` and `check.ts` | Nearest config selects the adapter. The checker binds claims, reads dependencies, and revalidates snapshots and import resolutions. | Prepare by suite form and track fixture, migration, and model inputs on the same source snapshot. [Suite orchestration](https://github.com/rorz/pud/blob/main/packages/pud/src/suite-check.ts) · [Snapshot validation](https://github.com/rorz/pud/blob/main/packages/pud/src/check.ts) |
| `cli.ts` and `reporter.ts` | One discovery path for `*.proof.ts`. `--emit` prints one verification unit. `--json` carries a result per property. | Use those entry points for both suite forms. Report the modeled boundary and any requested runtime evidence with the property. [CLI](https://github.com/rorz/pud/blob/main/packages/pud/src/cli.ts) · [Reporter](https://github.com/rorz/pud/blob/main/packages/pud/src/reporter.ts) |

## Fixtures and environments

A **fixture** describes a particular workflow in the application. Its input names and schemas can differ from the handler signature. The cancellation fixture declares an initial booking state and a retry schedule. Its bindings seed the rows from that state, supply the modeled database, and call `cancel(db, bookingId, nowMinute)` with the arguments from each attempt. It declares typed observation fields for the response, before and after rows, and committed credits. Use a typed `WorkflowFixture<Inputs, Observation>` declaration on the authoring side. The binder reads its supported declarations for schemas, seed data, argument mappings, and observation projections. A runtime fixture can implement the same setup and observations against an isolated database.

An **environment** gives meaning to operations the subject depends on. It declares the database dialect, driver contract, ordered migration inputs, and transaction isolation. It also names assumptions such as a supplied clock or an already authenticated tenant. The fixture names an environment from the nearest `pud.config.ts`. A minimal proposed config beside the booking schema could read as follows.

```ts
export default defineConfig({
  adapter: leanAdapter(),
  environments: {
    booking: {
      dialect: "postgres",
      driver: { name: "pglite", version: "0.5.16" },
      migrations: ["./schema.sql"],
      isolation: "read committed",
    },
  },
});
```

The profile selects the database semantics implemented by the adapter. The profile also needs to identify the admitted driver contract and its version when checked. Migrations resolve from the config that declares them. An explicit `check(file, { adapter })` override replaces the assistant. The workflow still resolves its environment from the selected project config. Pud should track that config and its relevant imports, the fixture declaration, the actual entry and its dependencies, and the selected migration and model inputs. The current config cache keys on config source, so changes to imported declarations have to feed cache invalidation as well as final verification. A migration change during a run invalidates the verdict. [Current config loader](https://github.com/rorz/pud/blob/main/packages/pud/src/suite-check.ts) · [Debit migration and linking plan](https://github.com/rorz/pud/blob/main/experiments/debit-endpoint/lean-port.md)

## One observation per execution

The workflow overload supplies scoped `it`, `expect`, and `run` helpers whose types come from the fixture. To start, `run` binds named symbolic inputs to one execution history per property. Pud continues to parse sidecars as source. The helper is a declaration the binder understands. Every assertion about the return, final balance, and committed writes projects from that same history. The binder checks the fixture’s declared inputs and projections before asking an adapter to lower the subject. A runtime runner can use that bound claim when the proof adapter lacks a model for an application operation.

The normalized workflow claim has a starting-state and schedule domain, any additional premises, the bound run, and assertions about its output. Keep the existing `ProofClaim` for a function call and give workflow claims a distinct shape. Add typed record fields, lists, and optional values on the workflow path. The HTTP slice will also need bounded status values and the specific string and JSON behavior its route uses. Keep the current meaning of scalar call equality. Workflow equality compares values of the same modeled type, so a list of credits or two observed row snapshots can be compared. Pure specification helpers such as `expectedRefund` must resolve to supported expressions or frozen source too. Print the starting-state and schedule assumptions so a reader can see which application states the proof admits.

For the first cancellation suite, the schedule supplies the clock and whether an attempt hits a modeled abort or may proceed. At least one healthy attempt is an input premise in the exactly-once law. A committed credit is a conclusion checked from the resulting history. Writes enter the committed history only when the transaction commits. When the reply is lost after a commit, the committed state is still visible to the next request. When rollback wins, pending writes disappear before the next attempt. The rollback law can quantify over schedules where every attempt aborts. [[First Mate's Log/Verification/runtime-checks-and-effect-proofs#A checked cancellation model|Lean model evidence]]

## Adapter contract

The following signatures are illustrative. `WorkflowSource` carries the same frozen entry and dependency readers as `SubjectSource`, plus the resolved fixture declaration and environment. The adapter checks that the linked workflow can produce each observation with its declared type. The existing proof modules, native term checks, per-claim progress, and proof outcomes apply to both preparation paths.

```ts
interface WorkflowFixtureSpec {
  environment: string;
  inputs: readonly WorkflowInput[];
  seed: WorkflowSeed;
  calls: WorkflowCallBindings;
  observations: readonly ObservationProjection[];
}

interface WorkflowSource extends SubjectSource {
  fixture: WorkflowFixtureSpec;
  environment: EffectEnvironmentSpec;
}

interface PreparedWorkflowProofAssistant {
  emit(
    claim: WorkflowClaim,
    modules: readonly ProofModule[],
  ): string | Promise<string>;
  verify(
    claims: readonly WorkflowClaim[],
    modules: readonly ProofModule[],
    onClaim?: ClaimProgress,
  ): Promise<readonly ProofOutcome[]>;
}

interface ProofAssistant<Id extends string = string> {
  readonly id: Id;
  prepare(subject: SubjectSource): PreparedProofAssistant | Promise<PreparedProofAssistant>;
  prepareWorkflow?(
    source: WorkflowSource,
  ): PreparedWorkflowProofAssistant | Promise<PreparedWorkflowProofAssistant>;
}
```

An adapter with only `prepare` continues to support function laws. An effectful suite with that adapter reports `UNSUPPORTED` at the fixture boundary. Lean can handle the first workflow by lowering the actual TypeScript callback, the awaited queries and bind arguments, the linked credit rule, and the migration. Its Postgres model supplies the admitted operations and rollback behavior. Unknown SQL or a host call outside that model reports `UNSUPPORTED` at the operation. `--emit` should show the same linked operations and assumptions used for verification. [Current Lean adapter](https://github.com/rorz/pud/blob/main/packages/pud/src/lean/index.ts) · [Experimental SQL lowering](https://github.com/rorz/pud/blob/main/experiments/debit-endpoint/internal/lower.ts)

The first proof can take serialized attempts as its scope. The handler uses `FOR UPDATE OF b` before reading the booking’s stored refund. A claim about overlapping requests also needs to justify which interleavings the lock and isolation level allow. The same fixture can drive multiple connections to a real Postgres server for conformance once that scope is modeled. [Postgres row locks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS) · [Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)

## Results and compatibility

Keep the current verdict meanings and top-level report shape for existing function suites. Add optional details to a workflow result for its proof assumptions and any requested runtime runs. A runtime runner takes a concrete case from the bound domain, seeds a fresh fixture, invokes the actual entry, and checks the same projected observations. It can compare those observations with an executable model where the adapter provides one. The runner is independent of the proof assistant and can reuse the existing database replay. [Current report types](https://github.com/rorz/pud/blob/main/packages/pud/src/check.ts) · [Debit replay](https://github.com/rorz/pud/blob/main/experiments/debit-endpoint/replay.ts)

| Evidence | Result |
| --- | --- |
| The assistant proves the law over the stated model. | `PASS`, with the modeled environment for a workflow. |
| The assistant leaves the claim open, or encounters an unmodeled operation. | `UNPROVED` or `UNSUPPORTED`, with the affected source location. A passing sample run leaves that proof verdict intact. |
| A concrete run violates the law. | `FAIL`, with the starting state, inputs and schedule, environment, and first differing field. If the modeled law passed, show the proof result alongside the runtime failure so the gap is visible. |
| A requested fixture or tool fails to run, or a proof input changes during the run. | `ERROR`, with the dependency or fixture failure. |

For a workflow, preserve the proof outcome and runtime evidence in optional details and keep one top-level status per property. Select that status in order of precedence `ERROR`, `UNSUPPORTED`, `FAIL`, `UNPROVED`, then `PASS`. A passing runtime sample contributes evidence and leaves the proof result intact. This keeps the current exit codes and lets a result show both an unsupported proof and a reproduced runtime failure. A runtime result needs a case count and reproducible input, including a lossless representation for bigint and byte values in JSON. The command line can add an opt-in for running fixtures when that runner lands. [CLI result handling](https://github.com/rorz/pud/blob/main/packages/pud/src/cli.ts) · [[Handbook/Engineering/reading-a-proof-result|Current verdict meanings]]

## Implementation order

1. **Keep current adapters working.** Add the workflow overload and a typed observation record, then route the new form through `prepareWorkflow`. Exercise discovery and emission in a directory containing a unit suite and a workflow suite. A call-only adapter should keep its current unit results and report the workflow as `UNSUPPORTED`.
2. **Prove one real transaction.** Use the booking migration and the actual cancellation export. The write probe found one useful boundary. Lower each query in source order, with its source span and the inputs bound to the SQL placeholders. Extend that to the locked read, refund guard, credit call, and transaction exits. Establish one committed credit and its stored amount across modeled retries, and unchanged committed state across aborts. The same sidecar should lose its proof if either the account update or refund write is removed. Editing the schema or a bound dependency during checking should invalidate the result. [[First Mate's Log/Verification/runtime-checks-and-effect-proofs#Deriving the writes from TypeScript|Write probe and mutations]]
3. **Check correspondence against the existing Postgres fixture.** Compare normal completion, rollback, retries, and the two write mutations using the same before-and-after observations. A repeatable field-level mismatch makes a useful witness, including when the model had passed.
4. **Extend the entry point to HTTP.** Link the actual debit route, its request parsing and validation, and its transaction. Check both an inadmissible raw request and a valid repeated request. State any authenticated context at the fixture boundary. Expand to overlapping attempts only with explicit session and isolation semantics.

The three refund laws already pass through the current CLI. The booking and debit experiments exercise real PGlite transactions, and the handwritten Lean model establishes the cancellation law under its own assumptions. Those are useful baselines for the proposed interfaces. The first source-linked workflow verdict is the acceptance milestone.
