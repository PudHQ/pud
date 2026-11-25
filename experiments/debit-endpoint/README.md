# PostgreSQL debit experiment

This standalone experiment preserves a real debit handler, its migration, the TypeScript and SQL lowering, and PostgreSQL replay. It has its own dependencies and test command. The next verification milestone is a Lean proof of the transaction properties. [Lean port plan](lean-port.md)

## Run the experiment

Install the repository's Bun dependencies first so the experiment can use Pud's TypeScript frontend. From the repository root run

```sh
bun install --frozen-lockfile
bun install --cwd experiments/debit-endpoint --frozen-lockfile
bun run --cwd experiments/debit-endpoint test
```

The tests apply [schema.sql](schema.sql) to an isolated PGlite database and exercise the [HTTP route](route.ts) and [transaction handler](handler.ts). Replay records each response, the before-and-after balances and receipts, and any exception or transaction left open. It also prepares the known writes that the [lowering](internal/lower.ts) extracted from the handler. [Replay](replay.ts) · [Database fixture](postgres.ts)

The six replay cases cover a funded debit, a retry of a committed request, reuse of the request ID in a different tenant, insufficient funds, a retry after topping up, and an account ID that exists only in another tenant. The tests also exercise the upper int64 boundary and model changes to SQL and bind parameter order.

## Properties to carry forward

| Condition at entry | Expected result and committed state |
| --- | --- |
| The tenant already recorded the request ID | Return `duplicate` and preserve balances and receipts. |
| The request is new and the tenant's account covers the debit | Return `applied`, subtract exactly the requested amount from that account, and add that tenant's receipt. Preserve every other row. |
| The request is new and the tenant's account is absent or unfunded | Return `declined` and preserve balances and receipts. |

These laws cover normal completion with a dedicated serializable connection, authenticated tenant context, valid text IDs and a positive int64 amount. The runtime tests exercise concrete requests on one connection. The Lean plan describes the separate obligations for query semantics, source linkage, exceptions, and transaction scope. [Previous formal experiment](https://github.com/rorz/pud/tree/17d78bc5172b5c95fefec3b4d59e911fd103eb24/experiments/debit-endpoint)
