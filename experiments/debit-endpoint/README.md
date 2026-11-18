# Debit endpoint

This standalone example checks a tenant-scoped wallet debit from TypeScript through its SQL write. Review the three `//@ ensures` clauses beside [the transaction](handler.ts). [The HTTP route](route.ts) gets the tenant from authenticated context, accepts integer cents as a decimal string, and uses a dedicated database session.

## Run it

From the repository root, with Bun and [Dafny 4.11](https://github.com/dafny-lang/dafny/releases/tag/v4.11.0) installed:

```sh
cd experiments/debit-endpoint
bun install --frozen-lockfile
bun run pud check
bun run demo
```

Set `DAFNY` to an executable path if needed. The proof runs locally. The replay creates a disposable [PostgreSQL database in memory using PGlite](https://pglite.dev/docs/about). The demo removes the tenant condition in a temporary copy, checks the same contracts again, and prints the actual rows that changed. In that run Acme requests a 30-cent debit and Birch’s balance also drops from 100 to 70 cents.

## CLI and library

Use one command locally and in CI. Supply a file to check a different copy of the handler; its `schema.sql` lives beside it. This isolated package defaults to `handler.ts`.

```sh
bun run pud check
bun run pud check handler.ts --json
```

The human output shows one verdict per contract, with its source line. A replayed counterexample includes the request and affected balances. The JSON output is the same typed report returned by the [library](lib.ts).

```ts
import { check } from "@pud/debit-example";

const report = await check("handler.ts");
if (report.status === "disproved") {
  console.log(report.counterexample);
}
```

The package name is local to this private experiment. The app itself imports no verification library. Annotations live with the behavior; the developer does not register a schema, proof file, solver, or replay fixture at the call site.

| Verdict | Evidence | CLI exit |
| --- | --- | --- |
| `PROVED` | Dafny established the clause for all valid states of the supported transaction model. | 0 if all proved |
| `DISPROVED` | An HTTP request on embedded PostgreSQL violated the actual reviewed clause. | 1 |
| `UNPROVED` | Dafny did not establish the clause and the returned replay contains no witness against that clause. | 1 |
| `UNSUPPORTED` / `ERROR` | The checker cannot translate the input, or a required tool or execution failed. | 2 |

## The three contracts

- **debit** — A fresh request against a funded account returns `applied`. Exactly the authenticated tenant’s selected balance decreases by the requested cents, and exactly its request receipt is added.
- **decline** — A fresh request against a missing or underfunded account returns `declined`. Both tables stay as they were. A later retry after funding can succeed.
- **retry** — An existing receipt for this tenant and request ID returns `duplicate`. Both tables stay as they were. Reusing the key with a different payload still gives `duplicate`.

The clauses are a small specification language inside TS comments. `==>` means “implies.” `account` means the pair of authenticated tenant and requested account. `request` means the pair of authenticated tenant and request ID. `funded` and `seen` read the pre-transaction state; `debitedOnly`, `recordedOnly` and `unchanged` compare the complete before and after tables. The [contract compiler](internal/contracts.ts) translates the expression itself for both Dafny and concrete replay. The label only identifies the clause.

## What the proof covers

[The translator](internal/lower.ts) recognizes this TS transaction structure and the exact [migration](schema.sql). It reads the actual parameter arrays, SQL placeholders, update expression and row predicates. These determine which balances [the transaction model](verifier/Debit.dfy) updates. The formal model uses nonnegative PostgreSQL `bigint` balances, positive signed-64-bit debit amounts, composite keys, and no assumed postcondition for the database call.

The proof covers handled business outcomes under [PostgreSQL serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE), with a dedicated connection, valid database text IDs with deterministic equality, the stated schema, and a trusted authenticated tenant. Database execution errors propagate. A caller retrying after an aborted or uncertain transaction must keep the same request ID. HTTP parsing, auth middleware, production schema drift, and concurrent client scheduling are outside the formal claim.

Six [HTTP replays](replay.ts) exercise the route, its status codes, the selected transaction, and actual database state on one connection. Replay stops at the first violating observation. With the tenant guard removed, the debit clause has a concrete witness, the decline clause is unproved, and the duplicate-request clause still proves.

The translation deliberately recognizes one transaction shape. Removing a tenant condition or swapping SQL bindings changes the generated proof obligation. Other control flows, queries and migrations outside the supported subset produce `UNSUPPORTED`. The proof depends on the correctness of this translation and its PostgreSQL semantics.

Run `bun run typecheck` and `bun run test` here for the HTTP, translation, and end-to-end regression checks.
