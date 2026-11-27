---
author: codex
date: 2026-11-25
updated-at: 2026-11-25
summary: How Pud could run production code against real fixtures, compare observations with a model, and prove selected effects through its configured adapters.
tags: [verification, runtime, replay, postgres, serialization, codex]
---
# Runtime checks and effect proofs in Pud

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud should be able to prove laws about an entire transaction. The suite should describe the application entry point, the starting states, and what must be true after it runs. A configured proof assistant can model the effects and establish the law over those states. Running the same contract against the application can check whether the real system agrees with the model. [[First Mate's Log/Verification/Lean/configured-proof-assistant-adapters|Configured proof assistant adapters]]

## What runs today

The Lean adapter’s replay prototype tries supported unconditional call equalities when Lean leaves a claim open. It runs both calls in Bun using the same frozen source and resolved imports as the proof. I reran the availability regression. The two equivalent implementations passed, and dropping a batch produced a concrete `FAIL` with different return values.

The standalone debit experiment already goes through an HTTP route and a transaction against PGlite. It applies the migration, sends requests to the actual handler, and records the status, balances, receipts, and transaction closure. It asks Postgres to prepare the extracted SQL statements as a separate check. All seven tests passed. The replay test visits six scenarios covering a funded debit, retries, declined requests, and tenant boundaries. The experiment has a Lean port plan for the same handler. [Debit replay](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/replay.ts) · [Lean port plan](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/lean-port.md)

I also ran the workshop booking flow on two fresh PGlite databases. For each, the customer paid 111 cents, cancelled two hours before start, and retried the cancellation. The second copy omitted the SQL update that credits the account. The return values, refunded amount on the booking, and restored seat count all matched. Reading the account exposed the bug.

| Observation | Original | Missing credit write |
| --- | ---: | ---: |
| Cancellation credit | 55¢ | 55¢ |
| Retry credit | 55¢ | 55¢ |
| Refund stored on booking | 55¢ | 55¢ |
| Seats available | 8 | 8 |
| Account balance | 94¢ | 39¢ |
| Transaction left open | No | No |

## What other tools do

| Tool | What to borrow |
| --- | --- |
| fast-check | Generate sequences of actions against a real system and a simpler model. Its command runners support async operations and shrink failing scenarios. Use the library as an optional generator and shrinker for Pud’s runtime checks. [Model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/) |
| LemmaScript Crosscheck | Compare the verified Dafny model with the actual JavaScript using inputs that meet the proof’s preconditions. Its documented workflow audits synchronous exports, checks returns and effects such as input mutation and output, and saves replayable mismatches. This is the closest precedent for checking the link between Pud’s model and the app after a proof passes. [Crosscheck](https://github.com/midspiral/lemmascript-crosscheck#how-an-audit-works) |
| Cedar | Prove laws about an executable Lean specification and run randomized comparisons with the production Rust implementation. This gives the model a second job as the reference for concrete executions. [Cedar specification and testing](https://github.com/cedar-policy/cedar-spec/blob/main/README.md) |
| Lynx | Let ordinary tests call the same law that Lean checks. Its concurrent claims also quantify over the OTP interleavings represented by its model. This shows what proofs can establish once an adapter gives effects explicit semantics. [Lynx laws and effects](https://github.com/josevalim/lynx#features) |

## How I would structure Pud

**Make runtime execution a peer of the configured proof assistant.** A runtime fixture seeds the database or supplies byte inputs, calls the application through its normal entry point, and captures what the developer wants to check. An observation can include a return or error, exact bytes, and committed rows. Start with named scenarios. Generated inputs and shrunk command sequences can use the same fixture, recreated on each replay. Record the input or seed, the relevant runtime and migration, and the first difference between expected and observed behavior.

**Share the contract where both runners can use it.** For cancellation, the law should state how the return, account balance, inventory, and stored refund change. A second cancellation returns the recorded credit and preserves that state. The runtime runner checks the law against actual before-and-after rows. The proof adapter can establish it over a modeled transaction and all admitted starting states. An executable model also lets Pud compare the model’s predicted observation with the app’s observation on each case. That comparison can run after a successful proof, when a mismatch would expose a problem with the model or its link to the code. [Cedar differential tests](https://github.com/cedar-policy/cedar-spec/blob/main/README.md) · [Debit port’s observation contract](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/lean-port.md)

**State the evidence in the result.** A runtime result reports the cases exercised and their environment. A proof `PASS` applies to the stated law and model assumptions. An observed violation earns `FAIL` with a reproducible witness. A construct the proof adapter cannot model gets `UNSUPPORTED`. The runtime fixture can still run when a proof is open or unsupported. This fits Pud’s assistant-independent CLI and leaves each adapter responsible for the semantics it certifies. [[Handbook/Engineering/reading-a-proof-result|Current proof verdicts]]

## What an integration proof could look like

The proposed fixture-aware `describe` lets the sidecar quantify over an initial booking and a retry schedule while naming the actual `cancel` handler. The suite checks the refund amount, the stored state, and the credit history together. A separate rollback law covers schedules where every attempt aborts. [[First Mate's Log/Verification/proof-suites-from-unit-to-end-to-end#What the suites look like|Unit, transaction, and route examples]]

Checking the credit history catches duplicates even if a later write restores the same net balance. Checking the same history in a runtime fixture would need recorded transaction operations or a ledger. A proof that cancellation eventually commits would also need assumptions about the retry policy and database availability. [[First Mate's Log/Verification/workflow-proof-interfaces#One observation per execution|Workflow claim and observation]]

The author writes the app rule here. Database semantics, such as which query locks a row and what rollback undoes, belong in reusable Postgres support for the proof adapter. An end-to-end proof can start at the HTTP route as the model grows to cover request decoding, validation, and the other dependencies the route calls. [Veil’s Lean transition-system proofs](https://github.com/verse-lab/veil/blob/main/README.md) · [GoJournal’s transaction specifications](https://www.usenix.org/conference/osdi21/presentation/chajed)

## A checked cancellation model

I checked a handwritten model with Lean 4.19.0. It represents one booking and its committed balance, available seats, stored refund, and credit count. Each attempt can abort, commit and return a value, or commit with a lost reply. The theorem ranges over every finite sequence of attempts and each attempt can have a different candidate refund. If every attempt aborts, the committed state stays the same. Once any attempt commits, the amount from the first commit is recorded and credited once. Later attempts preserve that state, and a retry that replies returns the recorded amount.

For a concrete check, an aborted 55-cent attempt was followed by a 55-cent commit with a lost reply and a retry whose candidate refund was 111 cents. The model ended with 94 cents in the account, eight seats, a recorded refund of 55 cents, and one credit write. Removing the modeled balance update made Lean reject the theorem and left 39 cents in the account. Removing the stored refund made Lean reject it and allowed two credit writes.

With the workshop booking experiment present in the checkout, run the model from the repository root after `bun run setup:lean`.

```sh
ELAN_HOME="$PWD/.cache/elan" .cache/elan/bin/lean experiments/booking-verification/cancellation-model.lean
```

This proof assumes serialized attempts, atomic commit or rollback, and an already computed policy amount. Its state uses natural numbers. To certify the application, Pud still needs to derive the modeled steps from `booking.ts`, model the actual SQL and its signed 64-bit range, and link the refund calculation to this law. Overlapping calls need a model or a separately justified guarantee that the booking row lock serializes the relevant attempts. The current handler takes that lock with `FOR UPDATE OF b` before inspecting the stored refund. [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS)

## Deriving the writes from TypeScript

I used Pud’s TypeScript parser in a temporary probe to read the awaited `tx.query` calls between the credit calculation and the return in `experiments/booking-verification/booking.ts`. For each write it checked the static SQL and the order of the two bound arguments. It replaced the handwritten writes in the existing Lean model with the recognized operations in source order. The theorem and expected final state stayed the same across all variants. [Pud source parser](https://github.com/PudHQ/pud/blob/main/packages/pud/src/source.ts)

| Recognized operation | Checked bindings | Emitted change |
| --- | --- | --- |
| Add to the account balance. | Credit, then booking account ID. | Apply `creditAccount` to the pending state. |
| Add to the workshop’s available seats. | Booking seat count, then workshop ID. | Apply `releaseSeats` to the pending state. |
| Record the refund. | Credit, then booking ID. | Set the pending refund to `some due`. |

For the runtime comparison, each variant ran the actual booking and two cancellations on a fresh PGlite instance. The first cancellation was two hours before start. The retry used a clock value one day before start, so recomputing the refund would give 111 cents in place of the recorded 55 cents.

| Change to the TypeScript | Lean result for the extracted writes | Runtime after both requests |
| --- | --- | --- |
| Original. | The same law checked. | Both calls returned 55¢. Balance 94¢, eight seats, 55¢ recorded. |
| Swap the account and inventory writes. | The same law checked. | Both calls returned 55¢. Balance 94¢, eight seats, 55¢ recorded. |
| Drop the account credit. | Lean rejected the law. | Both calls returned 55¢. Balance 39¢, eight seats, 55¢ recorded. |
| Drop the stored refund. | Lean rejected the law. | The calls returned 55¢ and 111¢. Balance 205¢, nine seats, refund unset. |
| Swap the account update’s bind arguments. | The probe reported an unsupported bind order before emission. | — |

The probe held the TypeScript prefix fixed and reused handwritten semantics for the locked read, refund calculation, migration, and transaction outcomes. The reorder result applies to this serialized model and single-connection runtime case. The `pud check` milestone still needs to lower the prefix, bind the schema, and account for the driver’s outcomes. [[First Mate's Log/Verification/workflow-proof-interfaces#Implementation-order|Remaining source-linkage work]]

## Serialization and SQL are different proof boundaries

**Serialization.** Pud already proves the ZigZag integer mapping and a linked encode/decode roundtrip. A runtime fixture can take the next step by checking actual wire bytes against a spec vector or an independent implementation, including malformed input handling. For example, a Protobuf message with field 1 of type `sint32` set to `-1` encodes as `08 01`. Two codec functions can remain inverses after changing the format together. The wire check pins the public representation. A later proof could cover the byte encoder once its byte operations and input bounds have defined semantics. [ZigZag sidecar](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/zigzag-roundtrip.proof.ts) · [Protobuf wire encoding](https://protobuf.dev/programming-guides/encoding/)

**Database writes.** A proof of the actual transaction needs to link the handler’s branches and awaited commands to the SQL text, parameter binding, migration, and transaction behavior. The first model can cover the supported statements on one connection, including row counts, commit, rollback, and which rows are allowed to change. The debit lowerer already extracts the statements and binding order. Pud’s dependency snapshots can track the migration and imports, so the verdict belongs to the code and schema it checked. [Debit lowering](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/internal/lower.ts) · [Dependency tracking](https://github.com/PudHQ/pud/blob/main/packages/pud/src/assistant.ts)

PGlite gives the first runtime checks a real SQL engine with a single connection. Testing contention requires multiple sessions against a Postgres server configured for the target isolation level. For example, Serializable mode can abort a transaction, and the application has to handle that retry. For later concurrency work, Elle shows how to infer isolation violations from recorded transaction histories. Any broader proof needs to state the schedules and failure behavior its model admits. [PGlite connections](https://pglite.dev/docs/) · [PostgreSQL Serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE) · [Elle paper](https://www.vldb.org/pvldb/vol14/p268-alvaro.pdf)

## First milestone

Make one real `pud check` suite prove cancellation for a seeded paid booking. Lower the actual handler’s locked read, account and inventory updates, refund write, and transaction outcomes. Require the same sidecar to lose its proof if the TypeScript balance update or refund write is removed. Compare the executable model with the existing Postgres replay on those cases, using its field-level differences to check the translation. The debit experiment’s SQL lowering and replay give this work a starting point. [Debit port plan](https://github.com/PudHQ/pud/blob/main/experiments/debit-endpoint/lean-port.md) · [[First Mate's Log/Verification/workflow-proof-interfaces#Implementation-order|Interface rollout and acceptance cases]]
