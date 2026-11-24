<p align="center">
  <a href="https://pud.dev"><img src="apps/www/public/pud.svg" width="144" alt="Pud, a caramel pudding with round glasses and a pink bow tie"></a>
</p>

# Pud

**The proof-running toolchain for TypeScript.** A booking should never increase the number of available seats. Write that rule as a TypeScript property and Pud uses Dafny to check it for every input in the supported model. If replay finds a counterexample, Pud shows the input and what the function returned.

Pud is under active development. You can run the examples today or [join the alpha at pud.dev](https://pud.dev/#alpha).

[PudDex](https://dex.pud.dev) is the company wiki and link directory. Open its [Markdown content folder](apps/dex/content) as an Obsidian vault.

> [!WARNING]
> **Are you an AI agent?**
>
> Read [LLMs.txt](./llms.txt) first

## Workspace

Install the Bun version in [package.json](package.json) and the Node version in [.nvmrc](.nvmrc), then run `bun install --frozen-lockfile` from the repository root. The root Bun catalog pins dependencies for every workspace. PudDex uses a named TypeScript 6 catalog because the Astro checker supports TypeScript 5 and 6.

| Workspace                                              | Purpose                                            |
| ------------------------------------------------------ | -------------------------------------------------- |
| [Pud landing site](apps/www/README.md)                 | Vinext Worker with D1-backed alpha signups         |
| [PudDex](apps/dex/README.md)                           | Static Astro site built from an Obsidian vault     |
| [CLI](packages/cli/README.md)                          | Public command, authoring API, and package archive |
| [Model](packages/model/README.md)                      | Shared verification model and backend interfaces   |
| [Postgres](packages/postgres/README.md)                | Embedded PostgreSQL fixture for replay             |
| [Debit endpoint](experiments/debit-endpoint/README.md) | Runnable experiment using the shared packages      |

Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` at the root to check the workspace and build both sites. The tests include proof replay and require [Rocq](https://rocq-prover.org/docs). Pud can provision Dafny on first use. CI runs the same commands and both proof demos. [Proof workflow](.github/workflows/proofs.yml)

| Site                | Dev               | Build               | Preview               | Deploy               |
| ------------------- | ----------------- | ------------------- | --------------------- | -------------------- |
| Landing site · 4901 | `bun run dev:www` | `bun run build:www` | `bun run preview:www` | `bun run deploy:www` |
| PudDex · 4902       | `bun run dev:dex` | `bun run build:dex` | `bun run preview:dex` | `bun run deploy:dex` |

Reuse the app already listening on its assigned port. Build before running preview and free the assigned port before switching between dev and preview. Both apps use Vite and Tailwind and ship to Cloudflare Workers with the workspace's `cf` CLI. Sign in once with `bun run --cwd apps/www cf auth login`. Check setup with the same deploy command and `--dry-run`. The [landing site release notes](apps/www/README.md#release) cover D1 migrations and the [PudDex release notes](apps/dex/README.md#release) cover its asset build.

Use lowercase, hyphenated source filenames and directories. Keep framework route syntax, conventional files like `README.md`, authored Obsidian titles, and filenames used by proof tooling or published proof examples. [Repo skills](skills/README.md)

## Try it locally

After [workspace setup](#workspace), run this command from the repository root.

```sh
bun run pud check packages/cli/demo/seats.proof.ts
```

You should see `2 passed`. The proof file imports `reserveSeats` directly. Its first predicate compares the result, `remaining`, with the original seat count.

```ts
import { proof } from "@pud/cli";
import { reserveSeats } from "./seats";

export default proof(
  reserveSeats,
  "A reservation never creates seats",
  (available, requested, remaining) => remaining <= available,
);
```

The second property names the condition `fits`, checks rejected reservations with an early return, and checks the exact seat count for an accepted reservation. Edit the function and rerun the command to check both claims. [Implementation](packages/cli/demo/seats.ts) · [Seat properties](packages/cli/demo/seats.proof.ts)

To see a failure against a database, run the debit demo. It checks the real handler, removes its SQL tenant filter in a temporary copy, and shows which other tenant’s balance changed in PostgreSQL. [Debit example](experiments/debit-endpoint/README.md)

```sh
bun run demo
```

## Run your own checks

To use Pud in another Bun project, run `bun run pack:cli` in this checkout. It prints the path to a self-contained package. Install that file in your app.

```sh
bun add --dev /path/to/pud-cli-0.0.1.tgz
```

Put a `*.proof.ts` beside a function. Import `proof` and the function, then export a property or an array of properties. The callback gets the function’s arguments in order and the return value last. The editor infers their TypeScript types. Pud reads the sidecar statically. The package covers pure checks, while the database example uses additional workspace packages.

For a first run, copy [seats.ts](packages/cli/demo/seats.ts) and [seats.proof.ts](packages/cli/demo/seats.proof.ts) into your app, then run `bunx --no-install pud check`. Change `available - requested` to `available + requested` and rerun to see the input that breaks the rule.

Pud checks properties automatically with Dafny, and can also check an explicit Rocq proof. To check the debit properties in this checkout, run

```sh
bun run pud check experiments/debit-endpoint/debit.proof.ts
```

`pud` and `pud check` discover sidecars below the working directory. Pass a directory or individual sidecars to select a suite, `--json` for machine-readable results or `--verbose` to show the properties. The Bun library returns the same per-file report.

```ts
import { check, emit } from "@pud/cli";

const { results } = await check("seats.proof.ts");
const unit = await emit("seats.proof.ts", "A reservation never creates seats");
```

Dafny is set up on first use and shared across projects in your user cache. Pud also recognizes a toolchain already installed under the working directory’s `.cache/dafny/`. Set `PUD_CACHE_DIR` to choose the cache or `DAFNY` to select a complete installation. Use `pud --emit FILE.proof.ts "property name"` to inspect a verification unit independently of the prover and replay. The command without a selector works for single-property files.

## How the model fits together

| Part                                                                            | Responsibility                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Pud model](packages/model/src/model.ts)                                        | Typed expressions, local bindings, branches, returns and domain-specific operations. The data structures have no parser or solver dependencies.                                                                                                                                              |
| [TypeScript frontend](packages/model/src/typescript.ts)                         | Read ordinary control flow from the parsed function. The pure frontend binds `bigint` and `boolean`. A domain adapter can give meaning to additional values and effects.                                                                                                                     |
| [Adapter and backend interfaces](packages/model/src/adapter.ts)                 | A domain adapter models an export, binds each predicate, and replays the original implementation. A proof backend emits and verifies a claim and can suggest inputs for replay. Adapter authors can import the types from `@pud/cli`. Custom adapters and backends are trusted project code. |
| [Dafny](packages/model/src/dafny.ts) and [Rocq](packages/cli/src/rocq-model.ts) | Render the shared model. Dafny checks automatic properties. Rocq checks explicit proofs of pure functions.                                                                                                                                                                                   |
| [Postgres replay](packages/postgres/src/postgres.ts)                            | Apply application migrations to an isolated PGlite database. The example’s separate [ledger adapter](experiments/debit-endpoint/ledger.ts) supplies its formal SQL semantics.                                                                                                                |

The pure model covers required `bigint` and `boolean` arguments, immutable local bindings, branches and the operations listed below. General JavaScript `number` arithmetic is unsupported. The ledger adapter covers the documented SQL operations and transaction model. Proofs rely on the translator, the adapter’s assumptions, and the selected prover.

## Explicit Rocq proof demo

Install [Bun](https://bun.com/docs/installation) and [Rocq 9 with its standard library](https://rocq-prover.org/install). Put `rocq` on your PATH or set `ROCQ` to its executable. From the repository root run

```sh
bun install --frozen-lockfile
bun run demo:rocq
```

The [demo](packages/cli/demo/replay.ts) works in a temporary directory. It holds [the reviewed property](packages/cli/demo/bounds.proof.ts) fixed throughout.

| Change to `max`                                                                   | Result                                                                            |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Original implementation, `a < b ? b : a`                                          | `PASS`. Rocq checks the proof.                                                    |
| Equivalent implementation, `b < a ? a : b`                                        | `UNPROVED`. The original proof splits on the old comparison.                      |
| Same implementation, [agent’s repaired proof](packages/cli/demo/repair/Maximum.v) | `PASS`. The same repair also checks against the original implementation.          |
| Wrong implementation, `a < b ? a : b`                                             | `FAIL`. Calling `max(0n, 1n)` returns `0n`, which violates the reviewed property. |

The repair was written by an agent given the failing proof and the generated theorem. The demo replays the saved repair locally. To check just the current files, use the same command on a laptop or in CI.

```sh
bun run --silent verify packages/cli/demo/bounds.proof.ts
```

## Link a Rocq proof

Use a named value import in a `*.proof.ts` file. The predicate takes the function’s arguments in order and its result last. Here the final clause rules out returning a number larger than both inputs.

```ts
import { max } from "./bounds.ts";

export default {
  subject: max,
  property: (a: bigint, b: bigint, r: bigint) =>
    r >= a && r >= b && (r === a || r === b),
  proof: "./Maximum.v",
  theorem: "max_correct",
};
```

A manifest can contain one definition or an array. Paths are relative to the manifest. The CLI parses it statically. To give a coding agent the generated model and exact theorem, run

```sh
bun run pud --emit packages/cli/demo/bounds.proof.ts max
```

Ask the agent to edit only `Maximum.v`, prove `Theorem max_correct : Subject.claim.`, and rerun verification. Emitting the claim works before the proof exists. If several properties target the same function, pass `max.max_correct` to select a theorem.

At verification time, Rocq compiles the generated model and the proof in a fresh directory. A separate module checks the named theorem against the generated claim and [audits its axioms](https://rocq-prover.org/doc/master/refman/proof-engine/vernacular-commands.html#print-assumptions). An admitted lemma or an unrelated theorem leaves the claim unproved. Native Rocq reference specs also work. The [minimum check](packages/cli/demo/Minimum.v) uses `spec: "minimum"` in place of `property` and proves agreement with `Z.min`.

## What the results mean

| Result        | Meaning                                                                        |
| ------------- | ------------------------------------------------------------------------------ |
| `PASS`        | The selected prover established the reviewed claim within the supported model. |
| `FAIL`        | Replaying the actual implementation produced a counterexample.                 |
| `UNPROVED`    | Verification did not establish the claim and replay supplied no witness.       |
| `UNSUPPORTED` | A construct falls outside the selected model.                                  |
| `ERROR`       | Invalid input or a tool failure prevented a check.                             |

Pure-function replay tries up to 256 combinations of small signed bigints and booleans. When Dafny supplies scalar inputs for an inconclusive property, Pud also runs the actual TypeScript on those inputs and reports an observed violation. Database replay exercises the concrete cases in the adapter. Passing samples alone cannot produce a passing verdict. Exit `0` means every check passed, `1` means unproved or disproved, and `2` means an error or unsupported input and takes precedence.

A run checks a snapshot of the selected sidecars, TypeScript subjects and linked Rocq scripts. An adapter can register additional model inputs through `subject.readDependency`, which the ledger uses for its schema and formal SQL definitions. If one of those inputs changes before the report is returned, affected results ask you to rerun.

## Supported TypeScript

The pure frontend accepts named exported functions and `export const` arrows with required `bigint` or `boolean` parameters. Pud can infer a consistent return type from the body. It supports literals, initialized `const` locals, `return`, `if/else`, ternaries, integer `+`, `-`, `*`, comparisons, boolean `!`, `&&`, `||`, and strict equality on like types. Pure properties can use the same local bindings and control flow and must return a boolean on every path.

The enclosing module may include literal constants, type-only declarations or imports, and unrelated named functions. Runtime imports, executable module initialization, calls or mutation in the verified function, loops and JS `number` are outside this fragment. Witness replay executes only the validated bodies. The proof relies on the translator faithfully modelling this fragment, callers supplying the stated types, and sufficient execution resources. Use trusted local Rocq scripts.

The [paired Rocq/Dafny experiment](experiments/prover-comparison/README.md) records what a behavior-preserving edit required from each prover.

## License

Pud is licensed under the [MIT License](LICENSE). The bundled Google Sans Flex fonts are licensed under the [SIL Open Font License 1.1](apps/www/app/fonts/OFL.txt).
