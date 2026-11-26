# TypeScript compatibility benchmark

The adoption score is the fraction of pinned tasks for which Pud proves the stated law on the original source. The language score counts complete files from a named slice of Test262. PudDex displays the committed results and a [full-window technology tree](https://dex.pud.dev/compatibility/tree/). [Scorecard](https://dex.pud.dev/notes/handbook/engineering/verification/typescript-compatibility/) · [Snapshot](baseline.json)

## Reproduce the scores

Run these commands at the repository root with the Bun version in `package.json` and the Lean version in `packages/pud/.examples/lean-toolchain`.

```sh
bun run setup
bun run compat:check
bun run --silent compat:check --json
```

The first measurement downloads four public source archives. The runner verifies each SHA-256 digest before unpacking a fresh copy. Subsequent runs reuse the archives in `.cache/compatibility/`. An unavailable archive, damaged fixture, tool error, failed native control, missing observation, or disagreement with the upstream oracle invalidates the run.

## Unchanged-project pilot

The cohort has two predeclared tasks each for bigint-mod-arith, date-fns, TanStack Query, and Hono. These are deliberately different integration examples. Estimating population-wide adoption needs an independently selected cohort of actual applications. Keep rejected projects in that sample. Report the fraction reaching a first meaningful proof alongside the fraction of target tasks proved.

[The manifest](projects.ts) pins the full project archives, exact exports, reviewed observations and input domains. The runner adds a verification-only directory. It preserves the target source, surrounding declarations, imports, and package layout. Each task has three observations.

1. Bun runs the same verification function on multiple distinct in-domain inputs against the imported production export. UTC fixes the timezone. The runner validates argument types and ranges and disables automatic dependency installation. A failed control invalidates the measurement.
2. The bundled adapter prepares the original export with real relative module resolution. The report records the first source location that stops it. Removing that blocker may expose another.
3. Pud’s public `check` API verifies a normal sidecar over all inputs in the registered domain. A verification-only caller expresses each observation, including callback order, date normalization and hash equality. A pilot pass requires the original export and caller to translate and the law to prove. Every registered law stays in the denominator. The v2 cohort replaced the six closed observations in v1 with quantified laws.

A separate control proves that negation reverses a bigint’s order around zero. Changing the implementation to return the original value opens that proof. An open proof, unsupported construct or counterexample earns zero passes. Tool failures invalidate the run.

## Independent language evidence

Bun reported per-module counts against Node v26.3.0’s own test suite. For example, its HTTP result was 403 of 415. Pud’s first independent profile selects every `test/language/expressions/*/bigint-arithmetic.js` at the [pinned Test262 revision](https://github.com/tc39/test262/tree/4db99ac4dc8924279ae07ed3246385924e878519). [Bun’s release report](https://bun.com/blog/bun-v1.4)

The original files and [upstream license](test262/LICENSE) are vendored. Their Git blob hashes are checked. Bun executes each file under both strict and non-strict script semantics with the required `assert.sameValue` hook. For each assertion the runner puts the original operand expression in a typed, zero-argument function, runs Pud’s actual lowering, and evaluates its emitted definition in pinned Lean. Each outcome must equal the upstream expected bigint. The file passes when every assertion matches. Duplicate upstream vectors keep their original ordinals. This measures the specified expression vectors. Arbitrary-input proofs and the correspondence between TypeScript source and Bun have separate evidence.

The wider Test262 inventory includes every `.js` under `test/` except `*_FIXTURE.js`, including harness, staging, Annex B and Intl. It counts files once, independently of test variants. Only the six selected files currently have a mapping. Compiler coverage has its own inventory of JS/TS-family source files in [TypeScript v7.0.2 conformance](https://github.com/microsoft/TypeScript/tree/1e4744d68260a7cb91b62b12edc3f6a2187faaf1/tests/cases/conformance). Those compiler cases are unassessed. Runtime libraries and external hosts need their own profiles.

To regenerate the inventories from Git, supply checkouts containing the pinned objects. The scripts read blobs and paths directly from the named revision.

```sh
bun experiments/compatibility/import-test262.ts /path/to/test262
bun experiments/compatibility/import-typescript.ts /path/to/TypeScript
```

## Track progress

Run `bun run compat:update` and review the snapshot diff when results improve. CI recomputes the published snapshot and compares it with the pull request base or the previous commit on main. Within a cohort a formerly proved task, admitted export or passing assertion cannot regress, even if another starts passing. Changing projects, laws, pins or selection changes the cohort fingerprint and requires a new profile version. Version changes establish a new baseline. Git retains the old series.

The [roadmap](roadmap.ts) records prerequisites, present evidence, and an acceptance check for each area. Both Dex views use it. Edit a node when the evidence changes. Preserve the distinction between a feature demonstrated in one example, an engineering gap, a host contract, and a property requiring help from the author. Keep experimental ports and fixes to the benchmark adapter out of the unchanged-project numerator.
