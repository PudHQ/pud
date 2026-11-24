---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: Keep live proof progress and final diagnostics readable in a terminal and in a captured log.
tags: [cli, terminal, reporting, progress, verification, lean]
---
# Keeping proof diagnostics usable

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The Lean runner writes generated files to a temporary directory. A rejected proof can therefore name a generated Lean file unfamiliar to the person editing the TypeScript. The reporter pairs that diagnostic with the source sidecar’s `path:line` so the edit has a starting point.

The terminal layout groups properties by sidecar and gives each file a time. It wraps the diagnostic prose and writes its sidecar location as one string. In a capture, each status row carries the full path relative to the working directory. Captured failures and their diagnostics go to stderr. The verdict words remain visible with `NO_COLOR=1`.

The live panel displays queued, checking, and checked items in the current suite. Lean emits progress per claim, and the CLI runner can display a group when a backend submits it together. Lean and Rocq wait for their subprocesses asynchronously, so the active spinner and timer can update while the prover works. A thin white row at the bottom counts completed items across all suites. The terminal font controls its pixel height. [Terminal renderer](https://github.com/rorz/pud/blob/main/packages/cli/src/terminal-progress.ts) · [Progress events](https://github.com/rorz/pud/blob/main/packages/cli/src/check.ts)

The live count tracks work performed. Pud checks source snapshots and import resolutions before it prints the permanent verdicts. A two-suite PTY run can reproduce the animation and the transition to plain final rows. Redirection and `--json` keep machine-readable output free of terminal controls. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

Run these commands from the repository root to capture the plain report and inspect the generated code.

```sh
bun run --silent demo:lean packages/cli/experiments/lean/.examples/linear-search.proof.ts > lean-check.log 2>&1
bun run --silent demo:lean --emit packages/cli/experiments/lean/.examples/linear-search.proof.ts
```

The reporter lives in `packages/cli/experiments/lean/reporter.ts`. The search guide uses `--emit` to match the generated code to its sidecar. [Command Line Interface Guidelines on output](https://clig.dev/#output) · [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]
