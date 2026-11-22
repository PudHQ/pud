# Debit endpoint

This workspace example checks a tenant-scoped wallet debit from TypeScript through its SQL write. The sidecar imports the real transaction and states three reviewed properties. The HTTP route gets the tenant from authenticated context, accepts integer cents as a decimal string, and uses a dedicated database session. [Proof file](debit.proof.ts) · [Handler](handler.ts) · [HTTP route](route.ts)

## Development

Follow the [workspace setup](../../README.md#workspace), then run these commands from the repository root.

```sh
bun run pud check experiments/debit-endpoint/debit.proof.ts
bun run demo
```

On first use, `pud` verifies a small theorem to check the Dafny installation. It can reuse an existing toolchain in the working directory’s `.cache/dafny/`. If setup is needed, Pud downloads Dafny 4.11.0, checks the release’s SHA-256 digest, and installs it in your user cache for offline reuse across projects. Set `PUD_CACHE_DIR` to choose a cache directory or `DAFNY` to use a specific executable. Automatic setup supports macOS (Apple Silicon and Intel), Linux x64 and Windows x64. Extraction uses `unzip` on macOS and Linux and `tar` on Windows. [Dafny release](https://github.com/dafny-lang/dafny/releases/tag/v4.11.0)

The demo runs the public CLI on the original handler, then removes the SQL tenant filter in a temporary copy and runs it again. It displays both reports with the CLI’s renderer. One request now drops Birch’s balance from 100 to 70 cents. Another request for an account owned only by Birch returns `applied` to Acme. Each failing property shows its own HTTP request and the observed difference.

To try your own edit, change `handler.ts` and run `bun run pud check`. An early `return "duplicate"` on a funded request breaks the debit contract. Changing the decline branch from `ROLLBACK` to `COMMIT` saves a receipt for a debit that never happened. Renaming a query constant preserves the proof. A branch outside the six replay cases can still leave a contract unproved.

## Where the database comes from

`pud check` creates [PostgreSQL in memory with PGlite](https://pglite.dev/docs/about), applies `schema.sql`, seeds the example accounts, and passes the connection to the actual handler. PostgreSQL executes the handler’s SQL. The example supplies the six debit scenarios.

For your own replay, pass your migration SQL and application callback to [`withPostgres`](../../packages/postgres/src/postgres.ts). It applies migrations in order, returns the callback’s result, and closes the database after success or failure.

```ts
import { withPostgres } from "@pud/postgres";
import { debit } from "./handler.ts";

const schema = await Bun.file("schema.sql").text();
const status = await withPostgres(schema, async db => {
  await db.query("INSERT INTO accounts (tenant_id, account_id, balance) VALUES ($1, $2, $3)", ["acme", "primary", "100"]);
  return debit(db, { tenantId: "acme" }, { accountId: "primary", requestId: "order-1", amountCents: 30n });
});
```

The fixture can replay other PGlite-compatible schemas. A universal proof also requires a translation of the app’s queries and transaction semantics. This experiment includes that translation for the debit handler described below.

## CLI and library

The public CLI discovers `debit.proof.ts` from this directory. The sidecar selects the exported function and ledger adapter. Place `schema.sql` beside the implementation. The root command `bun run pud check experiments/debit-endpoint/debit.proof.ts` checks the same sidecar.

```sh
bun run pud check
bun run pud check --verbose
bun run pud check debit.proof.ts --json
```

The default view shows the contract titles, source locations, verdict counts, and elapsed time. A failing replay shows the HTTP exchange and the first mismatched value for each violated contract. Use `--verbose` for the reviewed expressions. Use `--json` for the per-file results.

```ts
import { check } from "@pud/cli";

const { results } = await check("debit.proof.ts");
for (const result of results) if (result.counterexample) console.log(result.counterexample);
```

The application imports no verification library. The [experiment’s lower-level API](lib.ts) also exposes PostgreSQL replay details and accepts the earlier inline `//@ ensures` format. The maintained example keeps its properties in one sidecar.

| Runner / JSON status | Evidence | CLI exit |
| --- | --- | --- |
| `PASS` / `proved` | Dafny established the clause for all valid states of the supported transaction model. | 0 if all proved |
| `FAIL` / `disproved` | An HTTP request on embedded PostgreSQL violated the reviewed clause. | 1 |
| `UNPROVED` / `unproved` | The proof is inconclusive and the replay supplies no counterexample for this clause. | 1 |
| `UNSUPPORTED` or `ERROR` | The checker cannot translate the input, or a required tool or execution failed. | 2 |

## The three contracts

- **debit** — A fresh request against a funded account returns `applied`. Exactly the authenticated tenant’s selected balance decreases by the requested cents, and exactly its request receipt is added.
- **decline** — A fresh request against a missing or underfunded account returns `declined`. Both tables stay as they were. A later retry after funding can succeed.
- **retry** — An existing receipt for this tenant and request ID returns `duplicate`. Both tables stay as they were. Reusing the key with a different payload still gives `duplicate`.

Each predicate receives a typed `DebitObservation`. `seen` and `funded` read the state before the call. `debitedOnly`, `recordedOnly` and `unchanged` compare the complete committed state. `result` observes the handler’s reply. The same predicate determines the Dafny claim and the expected outcome on PostgreSQL. [Observation definitions](internal/contracts.ts)

## What the proof covers

The ledger registers `schema.sql`, `Domain.dfy`, `Postgres.dfy`, and `Debit.dfy` as proof inputs. If one changes during `pud check`, each affected property reports which file changed and asks for a rerun.

Pud reads the imported export and represents its branches, returns and awaited queries as data. The PostgreSQL adapter parses each supported write, including its actual bind arguments. A commit publishes the pending state and a rollback discards it. The Dafny backend renders these operations directly. The database independently prepares every modelled write against the migration and executes the actual handler during replay. [Handler frontend](internal/lower.ts) · [SQL operations](internal/sql.ts) · [Dafny backend](internal/postgres-dafny.ts)

The model supports the ledger’s two tables, receipt inserts, guarded balance updates and serializable transactions. It checks the required column types, nonnegative balance constraint and composite primary keys. Tables, columns and primary key columns can be reordered. A balance update can use direct bind parameters or the single-row `FROM (VALUES ...)` form. New operations and state observations need adapter support. The TypeScript fragment includes immutable bindings, object destructuring, conditions, early returns, and database errors that are rethrown. [Schema](schema.sql) · [Domain](verifier/Domain.dfy)

Each property requires a normal return and scopes database work to a single serializable transaction that the handler closes. The proof assumes a dedicated connection, valid database text IDs with deterministic equality, the stated schema, and a trusted authenticated tenant. Database execution errors propagate. A caller retrying after an aborted or uncertain transaction must keep the same request ID. HTTP parsing, auth middleware, production schema drift, and concurrent client scheduling are outside the formal claim. [PostgreSQL serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE)

Six HTTP replays exercise the route, the selected transaction, and database state on one connection. PostgreSQL reports which commands ran and whether the handler left a transaction open. The fixture records abandoned work before rolling it back and reading committed state. When the handler throws on a valid request, the report shows the exception and the request that reached it. Each clause keeps its first counterexample as replay continues. With the tenant guard removed, separate requests disprove the debit and decline clauses, and the retry clause still proves. [Replay implementation](replay.ts)

The root `bun run typecheck` and `bun run test` include the HTTP, translation, and end-to-end regression checks.
