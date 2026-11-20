# Debit endpoint

This standalone example checks a tenant-scoped wallet debit from TypeScript through its SQL write. Review the three `//@ ensures` clauses beside [the transaction](handler.ts). [The HTTP route](route.ts) gets the tenant from authenticated context, accepts integer cents as a decimal string, and uses a dedicated database session.

## Run it

Run these commands from the repository root with Bun installed.

```sh
cd experiments/debit-endpoint
bun install --frozen-lockfile
bun run pud check
bun run demo
```

On first use, `pud` checks an available Dafny installation by verifying a small theorem. If setup is needed, it downloads the complete [Dafny 4.11.0 release](https://github.com/dafny-lang/dafny/releases/tag/v4.11.0), checks its SHA-256 digest, and caches it in this package’s `.cache/dafny/`. Later runs can use that cache offline. Automatic setup supports macOS (Apple Silicon and Intel), Linux x64 and Windows x64. Set `DAFNY` to use a specific executable. Extraction uses `unzip` on macOS and Linux and `tar` on Windows.

The demo checks the original handler, then removes the SQL tenant filter in a temporary copy. It declares the expected verdict before each run. Both use the same checker and reporter as `pud check`. With the supplied accounts, Acme’s 30-cent debit drops Birch’s balance from 100 to 70 cents. The failure report shows the balance required by the contract alongside the balance read from PostgreSQL.

To try your own edit, change `handler.ts` and run `bun run pud check`. An early `return "duplicate"` on a funded request breaks the debit contract. Changing the decline branch from `ROLLBACK` to `COMMIT` saves a receipt for a debit that never happened. Renaming a query constant preserves the proof. A branch outside the six replay cases can still leave a contract unproved.

## Where the database comes from

`pud check` creates [PostgreSQL in memory with PGlite](https://pglite.dev/docs/about), applies `schema.sql`, seeds the example accounts, and passes the connection to the actual handler. PostgreSQL executes the handler’s SQL. The example supplies the six debit scenarios.

For your own replay, pass your existing migration SQL and an application callback to [`withPostgres`](postgres.ts). It applies migrations in order, returns the callback’s result, and closes the database after success or failure.

```ts
import { withPostgres } from "@pud/debit-example";
import { debit } from "./handler.ts";

const schema = await Bun.file("schema.sql").text();
const status = await withPostgres(schema, async db => {
  await db.query("INSERT INTO accounts (tenant_id, account_id, balance) VALUES ($1, $2, $3)", ["acme", "primary", "100"]);
  return debit(db, { tenantId: "acme" }, { accountId: "primary", requestId: "order-1", amountCents: 30n });
});
```

The fixture can replay other PGlite-compatible schemas. A universal proof also requires a translation of the app’s queries and transaction semantics. This experiment includes that translation for the debit handler described below.

## CLI and library

Use one command locally and in CI. This package defaults to `handler.ts`. To check another copy, pass its path and place its `schema.sql` beside it.

```sh
bun run pud check
bun run pud check --verbose
bun run pud check handler.ts --json
```

The default view shows the contract titles, verdict counts, and elapsed time. Failed and inconclusive contracts include their source locations. A failing replay shows the HTTP exchange and the first mismatched value for each violated contract. Use `--verbose` for the reviewed expressions and individual replay scenarios. Use `--json` for the typed report returned by the [library](lib.ts).

```ts
import { check } from "@pud/debit-example";

const report = await check("handler.ts");
if (report.status === "disproved") {
  console.log(report.counterexample);
}
```

The package name is local to this private experiment. The app itself imports no verification library. Annotations live with the behavior; the developer does not register a schema, proof file, solver, or replay fixture at the call site.

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

The clauses are a small specification language inside TS comments. Each has an identifier and an optional quoted title for display. `==>` means “implies.” `account` means the pair of authenticated tenant and requested account. `request` means the pair of authenticated tenant and request ID. `funded` and `seen` read the pre-transaction state. `debitedOnly`, `recordedOnly` and `unchanged` compare the complete before and after tables. The expression determines what both Dafny and the HTTP replay check. [Contract compiler](internal/contracts.ts)

## What the proof covers

Pud reads the selected handler and projects its supported operations into a synchronous TypeScript function. Each awaited query operates on explicit pending state. A commit publishes that state and a rollback discards it. The actual branches, return values, SQL placeholders and bound arguments determine the program. LemmaScript 0.6.10 translates that function to Dafny. Pud links the generated method with concrete SQL operations and checks each reviewed clause against the method. The proof depends on the adapter and on LemmaScript’s translation. [Transaction adapter](internal/lower.ts) · [SQL operations](internal/sql.ts) · [LemmaScript integration](internal/lemmascript.ts)

The example supports the supplied ledger schema, static receipt inserts and balance updates, and a dedicated serializable transaction. The TypeScript subset includes immutable bindings, object destructuring, simple conditions, early returns, and database errors that are rethrown. Unsupported statements or external calls report a source line. New schemas and SQL operations need adapter support. The balances use nonnegative PostgreSQL `bigint` values and debit amounts use positive signed 64-bit integers. [Schema](schema.sql) · [Domain](verifier/Domain.dfy)

The proof covers handled business outcomes under [PostgreSQL serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE), with a dedicated connection, valid database text IDs with deterministic equality, the stated schema, and a trusted authenticated tenant. Database execution errors propagate. A caller retrying after an aborted or uncertain transaction must keep the same request ID. HTTP parsing, auth middleware, production schema drift, and concurrent client scheduling are outside the formal claim.

Six [HTTP replays](replay.ts) exercise the route, its status codes, the selected transaction, and actual database state on one connection. The fixture rolls back any work abandoned by an early return before inspecting the committed state. A proof also requires that the handler close any transaction it opened. Replay stops at the first violating observation. With the tenant guard removed, the debit clause has a concrete witness, the decline clause is unproved, and the duplicate-request clause still proves.

Run `bun run typecheck` and `bun run test` here for the HTTP, translation, and end-to-end regression checks.
