# Pud model

The shared verification model represents claims, reads proof manifests, and defines the interfaces used by domain adapters and prover backends. The proof assistant interface also describes the claims handed to a configured assistant by Pud's schema-based suites. Its workspace consumers include the [CLI](../cli/README.md) and the [debit experiment](../../experiments/debit-endpoint/README.md). [Proof assistant contract](src/assistant.ts)

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run typecheck` and `bun run test` from the root. [Model overview](../../README.md#how-the-model-fits-together)
