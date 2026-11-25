# Porting the debit transaction to Lean

The first milestone is a proof of the three [debit properties](README.md#properties-to-carry-forward) for the actual handler and migration. Keep the property declaration in a Pud sidecar and select the Lean adapter in project config. Use the existing replay to compare the implementation with the formal model as the port grows. [Pud adapter contract](../../packages/pud/src/assistant.ts) · [Current Lean lowering](../../packages/pud/.examples/README.md#what-a-pass-establishes)

## Model the database boundary

Represent accounts and receipts with composite keys `(tenantId, accountId)` and `(tenantId, requestId)`. The schema requires unique, non-null keys and nonnegative int64 balances. Model IDs with pairwise equality under an explicit text equality assumption. Keep balances as Lean integers with the PostgreSQL range invariant. A successful guarded subtraction preserves that range for positive int64 amounts. [Schema](schema.sql) · [Supported SQL grammar](internal/sql.ts)

Define a session transition for each admitted command. `BEGIN` opens a transaction from the committed state. `INSERT … ON CONFLICT DO NOTHING` produces either zero returned rows or one pending receipt. The balance update evaluates its actual predicate over rows using the actual bound arguments and returns the number of rows changed. `COMMIT` publishes pending writes and `ROLLBACK` discards them. Include row counts since the TypeScript branches on them. Give errors an explicit outcome so an aborted or uncertain commit stays distinguishable from a normal return. Prove the first laws for one dedicated connection and an explicit initial state. Concurrency, retries after an uncertain commit, and production collations each require further assumptions and evidence.

## Link the model to TypeScript and SQL

Reuse the experimental frontend that reads the handler's branches, awaited calls, SQL text, parameter order, and return values. Tie each emitted Lean operation to its query, binding, or branch. Preserve query order and the exception and cleanup paths. The existing lowering treats the admitted catch as a database-error boundary and lowers its successful body. A Lean port needs an explicit transition and propagation rule for the catch and its rollback, including what the handler observes if cleanup fails. [TypeScript lowering](internal/lower.ts)

Register `schema.sql` through `readDependency` and linked modules through `readModule` so a changed input invalidates the verdict. Use the actual migration and verify the primary keys, bounds, and column types before depending on them. An unfamiliar query, schema, or transaction mode should produce `UNSUPPORTED` at its source location.

The current suite types cover scalar and selected array inputs. Before exposing ledger properties in the public DSL, decide how a configured adapter will bind the initial ledger and final outcome, including table state and the user's result. Keep the binding within the shared `describe` and `it` workflow. Treat any additional record or effect types as extensions of the adapter contract. [TypeScript suite syntax](../../packages/pud/.examples/README.md#sidecar-syntax)

## Use proofs and replay together

Start with lemmas for the admitted commands, then compose the lemmas against the actual emitted transaction. Prove the funded, declined, and duplicate cases over the modeled initial state. Check native theorems at the emitted claim type and audit their axiom dependencies, as with current Lean suites. [Lean proof audit](../../packages/pud/src/lean/index.ts)

Compare Lean outcomes with the [PGlite replay](replay.ts) on each scenario, including the returned status, transaction closure, balances, and receipts. Replay gives a concrete witness when the implementation violates a claim. Preserve the request, the first differing state field, and its expected and observed values. An open Lean claim without a witness remains `UNPROVED`. Passing replay is evidence about those scenarios, and the Lean theorem covers the modeled domain.

The first integration check should reject a weakened tenant predicate, swapped bind parameters, and an early commit on decline. It should also report an edit to the migration during a run as an invalidated verdict. These cases exercise the link between the proof and the checked inputs. Keep the earlier database adapter and its findings available through [the historical revision](https://github.com/rorz/pud/tree/17d78bc5172b5c95fefec3b4d59e911fd103eb24/experiments/debit-endpoint).
