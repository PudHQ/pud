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

The availability tally shows a second workflow. Pud proves the same law after a split-and-merge refactor, then replays a version that drops one batch to show a concrete failing input. [Availability walkthrough](packages/pud/.examples/availability/README.md)

Run `bun run pud check --deny-cases packages/pud/.examples/motion` to prove six laws about Motion’s unchanged TypeScript `number` conversions. Each conversion has an exact unit rule across all JavaScript numbers and separate laws for sign and reversal. [Number sidecars](packages/pud/.examples/motion)

Run `bun run compat:check` to measure the bundled adapter on unchanged open-source projects and pinned Test262 arithmetic assertions. [Compatibility benchmark](experiments/compatibility/README.md) · [PudDex compatibility tree](https://dex.pud.dev/notes/handbook/engineering/verification/typescript-compatibility/)

## Run your own checks

Install Pud in your Bun project, then select a driver in `pud.config.ts`.

```sh
bun add -d pud.dev
```

```ts
// pud.config.ts
import { defineConfig } from "pud.dev";
import { leanAdapter } from "pud.dev/lean";

export default defineConfig({ adapter: leanAdapter() });
```

Install Lean on your path or through Elan. The adapter reads the nearest `lean-toolchain` pin. Copy the [cents implementation](packages/pud/.examples/cents.ts) beside this sidecar.

```ts
// cents.proof.ts
import { describe, expect, it, pud } from "pud.dev";
import { toCents } from "./cents.ts";

describe(toCents, () => {
  it("returns the nearest whole cent, with half cents rounded toward positive infinity", {
    amount: pud.number(),
  }, ({ amount }) => {
    expect(toCents(amount)).toExactly(pud.number().nearestIntegerTo(amount * 100, { ties: "up" }));
  });
});
```

For each possible input, `.toExactly()` checks that the function returns the only answer its rule allows. Here the input is an ordinary TypeScript `number`, and half-cent ties go to the higher integer. Use `.to()` for an invariant such as a lower bound.

Run `bunx --no-install pud check` to discover nearby `*.proof.ts` files. Pass paths to select suites. Use `--verbose` for full diagnostics or `--json` for CI. `pud.dev` also exports `check`, `checkFiles`, and `emit`. [CLI and authoring guide](packages/pud/README.md)

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

| Site | Dev | Build | Local preview | Worker Preview | Deploy |
| --- | --- | --- | --- | --- | --- |
| Landing site · 4901 | `bun run dev:www` | `bun run build:www` | `bun run preview:www` | `bun run deploy:preview:www` | `bun run deploy:www` |
| PudDex · 4902 | `bun run dev:dex` | `bun run build:dex` | `bun run preview:dex` | `bun run deploy:preview:dex` | `bun run deploy:dex` |

Reuse the app already listening on its assigned port. Build before running a local preview and free the assigned port when switching between dev and preview. Both apps ship to Cloudflare Workers. [Worker Previews](apps/dex/content/Handbook/Engineering/deploying-worker-previews.md) · [Landing site release notes](apps/www/README.md#release) · [PudDex release notes](apps/dex/README.md#release) · [Repository skills](skills/README.md)

## Publish to npm

Before the first CI release, open the trusted publisher settings for `pud.dev` on npm. Select GitHub Actions, enter `PudHQ` for the organization, `pud` for the repository and `publish-npm.yml` for the workflow filename. Leave the environment blank and enable `npm publish`. The first successful publish must occur within two days of creating the connection. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

For each stable release, bump the version in `packages/pud/package.json` and merge the change into `main`. Tag that commit and push the tag.

```sh
tag="v$(node -p "require('./packages/pud/package.json').version")"
git tag -s "$tag" -m "Release $tag"
git push origin "$tag"
```

The workflow checks the tag against the manifest, installs the built tarball offline, proves the clamp example and publishes that same tarball to npm with provenance. [Release workflow](.github/workflows/publish-npm.yml)

## License

Pud is licensed under the [MIT License](LICENSE). The bundled Google Sans Flex fonts use the [SIL Open Font License 1.1](apps/www/app/fonts/OFL.txt).

## Supporters

<!-- supporters:start -->

<a href="https://github.com/PudHQ/pud/issues/17#issuecomment-7219194602"><img src="https://avatars.githubusercontent.com/u/1853310?s=96&amp;v=4" width="48" height="48" alt=""> <strong>@rorz</strong> <sub>#0001</sub></a>
<a href="https://github.com/PudHQ/pud/issues/17#issuecomment-7219713607"><img src="https://avatars.githubusercontent.com/u/98127796?s=96&amp;v=4" width="48" height="48" alt=""> <strong>@VerdnBot</strong> <sub>#0002</sub></a>

<!-- supporters:end -->

[Add your GitHub profile here!](https://github.com/PudHQ/pud/issues/17) · [View the supporter roll](https://pud.dev/#supporters)
