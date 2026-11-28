[![Pud — Proofs for TypeScript](press/pud-github-social-card.png)](https://pud.dev)

Write a rule for a TypeScript function and ask Lean to prove it for every input you describe. Keep the implementation, its `*.proof.ts` file, and the project’s `pud.config.ts` together.

[Get Pud on npm](https://www.npmjs.com/package/pud.dev) · [Write your first proof](packages/pud/README.md#try-it) · [PudDex handbook](https://dex.pud.dev) · [Join the alpha](https://pud.dev/#alpha)

## Run your own checks

```sh
bun add -d pud.dev
npx pud.dev --help
```

Pud runs on Bun. The bundled adapter checks proofs with Lean. Start with the half-cent rounding example to see a failing input, fix the implementation, and prove the corrected rule. Once a project has proof files, run `npx pud.dev check` to find them. [Rounding quickstart](packages/pud/README.md#try-it) · [CLI and authoring guide](packages/pud/guide.md)

## Try it locally

From a clone, use the Bun and Node versions in [package.json](package.json) and [.nvmrc](.nvmrc). Setup installs the workspace dependencies and the pinned Lean toolchain.

```sh
bun run setup
bun run pud.dev check packages/pud/.examples/linear-search.proof.ts
bun run pud.dev --emit packages/pud/.examples/linear-search.proof.ts
```

| Example | What the proof checks |
| --- | --- |
| [Linear search](packages/pud/.examples/linear-search.proof.ts) | Returns the first match, or `-1n` when the value is absent. |
| [Availability across batches](packages/pud/.examples/availability/README.md) | A refactor preserves the tally. Dropping a batch produces a concrete counterexample. |
| [Motion time conversions](packages/pud/.examples/motion) | Six laws about JavaScript numbers, including the exact result of converting between seconds and milliseconds. |

Run `bun run compat:check` to measure the adapter against upstream projects and pinned Test262 arithmetic assertions. [Compatibility benchmark](experiments/compatibility/README.md) · [TypeScript coverage](https://dex.pud.dev/notes/handbook/engineering/verification/typescript-compatibility/)

## How the proof pipeline works

Pud reads the sidecar and freezes the TypeScript and proof inputs. The configured `ProofAssistant` prepares the target export, receives the typed claim, and returns a verdict. Portable properties use the same schemas, premises, and assertions across drivers. A configured suite can also supply driver-specific predicates or named proofs. [Adapter contract](packages/pud/src/assistant.ts)

Lean checks the generated theorem against the actual claim and audits its axiom dependencies. Pud rechecks input snapshots before publishing verdicts. A pass applies to the modeled TypeScript behavior and the declared input domain. [Lean coverage and guarantees](packages/pud/.examples/README.md#what-a-pass-establishes) · [Reading a result](<apps/dex/content/Handbook/Engineering/reading-a-proof-result.md>)

## Workspace

> [!NOTE]
> Agents working in this repository should start with [llms.txt](./llms.txt).

The private root package, `@pud.dev/monorepo`, owns the workspace scripts. The published `pud.dev` package lives in `packages/pud`.

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

Before the first CI release, register `PudHQ/pud` and `publish-npm.yml` as a GitHub Actions trusted publisher for `pud.dev`. Leave the environment blank and enable direct publishing. With npm 11.15 or newer, you can set this up from the CLI. Complete the first release within two days of creating the connection. [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)

```sh
npm trust github pud.dev --repo PudHQ/pud --file publish-npm.yml --allow-publish
```

After the code to release has merged, open **Actions → Publish Pud to npm → Run workflow**. Select `main` and enter the stable version, for example `0.0.3`. You can also start it with the GitHub CLI.

```sh
gh workflow run publish-npm.yml --ref main -f version=0.0.3
```

The workflow puts the requested version and source commit in the tarball, installs it offline and proves the clamp example. It creates the version tag and a draft GitHub release, publishes the same archive to npm with provenance, then opens the release to the public. If a step fails, rerun the failed jobs from the original run to keep the same source commit. The workflow checks any existing tag and archive before resuming. [Release workflow](.github/workflows/publish-npm.yml)

## License

Pud is licensed under the [MIT License](LICENSE). The bundled Google Sans Flex fonts use the [SIL Open Font License 1.1](apps/www/app/fonts/OFL.txt).

## Supporters

<!-- supporters:start -->

<a href="https://github.com/PudHQ/pud/issues/17#issuecomment-7219194602"><img src="https://avatars.githubusercontent.com/u/1853310?s=96&amp;v=4" width="48" height="48" alt=""> <strong>@rorz</strong> <sub>#0001</sub></a>
<a href="https://github.com/PudHQ/pud/issues/17#issuecomment-7219713607"><img src="https://avatars.githubusercontent.com/u/98127796?s=96&amp;v=4" width="48" height="48" alt=""> <strong>@VerdnBot</strong> <sub>#0002</sub></a>

<!-- supporters:end -->

[Add your GitHub profile here!](https://github.com/PudHQ/pud/issues/17) · [View the supporter roll](https://pud.dev/#supporters)
