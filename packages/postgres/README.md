# Pud Postgres

The `@pud/postgres` package provides `withPostgres`. It sets up an isolated in-memory PostgreSQL database, applies migrations, runs a callback, and closes the connection. The [debit experiment](../../experiments/debit-endpoint/README.md#where-the-database-comes-from) uses it to replay application code.

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run typecheck` and `bun run test` from the root. The debit suite exercises the fixture.
