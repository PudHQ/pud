---
author: codex
date: 2026-11-24
updated-at: 2026-11-28
summary: Keep live proof progress and final diagnostics readable in a terminal and in a captured log.
tags: [cli, terminal, reporting, progress, verification, lean]
---
# Keeping proof diagnostics usable

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The Lean adapter writes generated files to a temporary directory. A rejected proof can therefore name a generated Lean file. The `pud.dev check` reporter pairs that diagnostic with the source sidecar’s `path:line`.

The terminal layout groups properties by sidecar and gives each file a time. It wraps the diagnostic prose and writes its sidecar location as one string. In a capture, each status row carries the sidecar path. When a check exits with an error or an open proof, the text report goes to stderr. The verdict words remain visible with `NO_COLOR=1`.

The live panel gives the active property the headline and a spinner. Total elapsed time sits at the top right and the current proof timer sits below it. The trail starts after a blank line. Gray dots show the queue ahead, green and red dots show completed attempts behind it, and a diamond marks the running item. Every dot has the same spacing. Long queues divide into groups of roughly equal size so the trail fits the terminal. A completed group is red if any of its checks were unsuccessful, and green when all passed. The count remains exact. Monochrome uses different marks for queued, proved, and unsuccessful checks. [Terminal renderer](https://github.com/PudHQ/pud/blob/main/packages/pud/src/terminal-progress.ts)

A simulated run of 12,001 checks fit at both 32 and 88 columns. Progress events update the state and the animation renders on its frame timer. The two elapsed times distinguish the run from an individual claim as the panel moves between files.

Lean reports outcomes per claim. A backend that submits a group together can highlight one item and show how many others are running. Live outcomes are provisional. Pud checks source snapshots and import resolutions before it clears the trail and prints permanent verdicts. Redirection and `--json` keep machine-readable output free of progress controls. [Progress events](https://github.com/PudHQ/pud/blob/main/packages/pud/src/check.ts) · [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

In the installed-package test, a config import used both `console.log` and `process.stdout.write`. The CLI sent both lines to stderr. Stdout parsed as JSON for `--json` and matched the library’s verification unit for `--emit`. [Installed-package test](https://github.com/PudHQ/pud/blob/main/packages/pud/test/package.test.ts)

Run these commands from the repository root to capture the plain report and inspect the generated code.

```sh
bun run --silent pud.dev check packages/pud/.examples/linear-search.proof.ts > lean-check.log 2>&1
bun run --silent pud.dev --emit packages/pud/.examples/linear-search.proof.ts
```

CI checks the supported examples through the same command. The indexed `sumPositive` example exercises the `UNSUPPORTED` row and exit status 2 in the terminal regression test. [CLI reporter](https://github.com/PudHQ/pud/blob/main/packages/pud/src/reporter.ts) · [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]

## Counting completed properties

On Bun 1.4.2 and Lean 4.19.0, the two properties in `bigint-division.proof.ts` originally finished individually and then appeared again in a batch event. After moving completion tracking into the suite runner, the trace contained `finished [0]`, `finished [1]`, then `validating`. A caller can add `event.indices.length` on each completion. The runner also supplies a status for a binding error or a verifier that returns its verdicts without sending progress. [Division regression](https://github.com/PudHQ/pud/blob/main/packages/pud/test/lean.test.ts) · [Adapter regression](https://github.com/PudHQ/pud/blob/main/packages/pud/test/suite.test.ts)
