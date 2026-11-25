<p align="center">
  <a href="https://pud.dev"><img src="apps/www/public/pud.svg" width="144" alt="Pud, a caramel pudding with round glasses and a pink bow tie"></a>
</p>

# Pud

**The proof-running toolchain for TypeScript.** Write properties in TypeScript and select a proof assistant in `pud.config.ts`. Lean is the first bundled adapter. The same suite API and `pud check` command are designed to work with future adapters.

Try the examples or [join the alpha at pud.dev](https://pud.dev/#alpha). [PudDex](https://dex.pud.dev) holds the handbook and project notes.

> [!WARNING]
> **Are you an AI agent?**
>
> Read [LLMs.txt](./llms.txt) first

## Try it locally

Install Bun and Node using the versions in [package.json](package.json) and [.nvmrc](.nvmrc). Run these commands from the repository root.

```sh
bun run setup
bun run pud check packages/pud/.examples/linear-search.proof.ts
bun run pud --emit packages/pud/.examples/linear-search.proof.ts
```

The search proof checks that the returned index is the first match, or `-1n` when the target is absent. The terminal shows live progress, then verdicts, timings, and diagnostics by file. `--emit` prints the generated Lean unit for inspection. [Lean examples](packages/pud/.examples/README.md) · [Search walkthrough](<apps/dex/content/Handbook/Engineering/Verification/Lean/checking-typescript-with-lean.md>)

## Run your own checks

Build the self-contained package with `bun run pack:cli`. In your Bun project, install the archive and select a driver.

```sh
bun add --dev /path/to/pud.dev-pud-0.0.1.tgz
```

```ts
// pud.config.ts
import { defineConfig } from "@pud.dev/pud";
import { leanAdapter } from "@pud.dev/pud/lean";

export default defineConfig({ adapter: leanAdapter() });
```

Install Lean on your path or through Elan. The adapter reads the nearest `lean-toolchain` pin. Copy the [clamp implementation](packages/pud/.examples/clamp.ts) beside this sidecar.

```ts
// clamp.proof.ts
import { describe, expect, given, it, pud } from "@pud.dev/pud";
import { clamp } from "./clamp";

describe(clamp, () => {
  it("keeps the result between ordered bounds", {
    value: pud.bigint(),
    lower: pud.bigint(),
    upper: pud.bigint(),
  }, ({ value, lower, upper }) => {
    given(lower <= upper);
    expect(clamp(value, lower, upper)).to(pud.bigint().gte(lower).lte(upper));
  });
});
```

Run `bunx --no-install pud check` to discover nearby `*.proof.ts` files. Pass paths to select suites. Use `--verbose` for full diagnostics or `--json` for CI. `@pud.dev/pud` also exports `check`, `checkFiles`, and `emit`. [CLI and authoring guide](packages/pud/README.md)

## How the proof pipeline works

Pud reads the sidecar and freezes the TypeScript and proof inputs. The configured `ProofAssistant` prepares the target export, receives the typed claim, and returns a verdict. Portable properties use the same schemas, premises, and assertions across drivers. A configured suite can also supply driver-specific predicates or named proofs. [Adapter contract](packages/pud/src/assistant.ts)

Lean checks the generated theorem against the actual claim and audits its axiom dependencies. Pud rechecks input snapshots before publishing verdicts. A pass applies to the modeled TypeScript behavior and the declared input domain. [Lean coverage and guarantees](packages/pud/.examples/README.md#what-a-pass-establishes) · [Reading a result](<apps/dex/content/Handbook/Engineering/reading-a-proof-result.md>)

## Workspace

`bun run setup` installs dependencies from the lockfile and provisions the pinned Lean toolchain in `.cache/elan`. Use `bun install --frozen-lockfile` for Bun dependencies alone or `bun run setup:lean` for the toolchain alone. Run `bun run lint`, `bun run typecheck`, `bun run test`, and `bun run build` from the root. [Verification CI](.github/workflows/proofs.yml)

| Workspace | Purpose |
| --- | --- |
| [Pud](packages/pud/README.md) | Command, suite API, and proof-assistant adapters |
| [Landing site](apps/www/README.md) | Vinext Worker with D1-backed alpha signups |
| [PudDex](apps/dex/README.md) | Static Astro site built from an Obsidian vault |

The [PostgreSQL debit experiment](experiments/debit-endpoint/README.md) has its own test workflow and a [Lean port plan](experiments/debit-endpoint/lean-port.md). The [Rocq and Dafny comparison](experiments/prover-comparison/README.md) records what earlier systems taught us about proof reuse.

| Site | Dev | Build | Preview | Deploy |
| --- | --- | --- | --- | --- |
| Landing site · 4901 | `bun run dev:www` | `bun run build:www` | `bun run preview:www` | `bun run deploy:www` |
| PudDex · 4902 | `bun run dev:dex` | `bun run build:dex` | `bun run preview:dex` | `bun run deploy:dex` |

Reuse the app already listening on its assigned port. Build before running preview and free the assigned port when switching between dev and preview. Both apps ship to Cloudflare Workers. [Landing site release notes](apps/www/README.md#release) · [PudDex release notes](apps/dex/README.md#release) · [Repository skills](skills/README.md)

## License

Pud is licensed under the [MIT License](LICENSE). The bundled Google Sans Flex fonts use the [SIL Open Font License 1.1](apps/www/app/fonts/OFL.txt).
