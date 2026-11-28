---
author: codex
date: 2026-11-21
updated-at: 2026-11-28
summary: Read a Pud verdict, inspect a Lean diagnostic, and distinguish an open proof from an observed violation.
aliases: [Replaying the maximum proof]
tags: [verification, cli, lean]
---
# Reading a proof result

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

A `pud.dev check` verdict belongs to one property in a `*.proof.ts` file. The project config selects the proof assistant. Start with the property and its input schemas to see what the verdict covers.

```sh
bun run --silent pud.dev check packages/pud/.examples/linear-search.proof.ts
```

The search example proves that the function returns the index of the first match, or `-1n` when the list contains no match. Use `--verbose` for full diagnostics or `--json` for a structured report. When you pipe `--json` or `--emit`, stdout carries the requested output and project config logs go to stderr. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]

| Verdict | Evidence | Exit |
| --- | --- | --- |
| `PASS` | The selected prover established the property in its model. | 0 |
| `FAIL` | A concrete input exposes a wrong result or two values permitted by an exact result rule. | 1 |
| `UNPROVED` | The claim remains open. See the diagnostic and the generated verification unit. | 1 |
| `UNSUPPORTED` | A construct falls outside the selected model. The report identifies the restriction. | 2 |
| `ERROR` | An input, configuration, or tool error prevented checking. | 2 |
| `TODO` | The suite marks the property as pending and creates no obligation. | 0 |

Exit 2 takes precedence in a mixed run. The live panel shows provisional progress. Final verdicts follow the check for changes to the sources, imports, and model inputs. [[First Mate's Log/CLI/terminal-proof-output|Keeping proof diagnostics usable]]

For a property labeled `[exact result]`, a pass establishes one permitted answer for every input admitted by the sidecar. On an ambiguous rule, replay reports the observed return and a second permitted value at that same input. Read those two values against the requirement to decide which condition is missing. The JSON report includes `exactResult: true` and puts the second value in `counterexample.alternative` when found. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Specify a single result|Writing an exact result rule]]

Try the indexed loop in `packages/pud/.examples/sum-positive.proof.ts` to see an `UNSUPPORTED` verdict alongside a `TODO`. To inspect a supported claim, run `bun run --silent pud.dev --emit packages/pud/.examples/linear-search.proof.ts`. [Proof sidecar](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/sum-positive.proof.ts) · [[First Mate's Log/Verification/Lean/Language Coverage/typescript-to-lean-coverage-map#Indexed traversal is one coverage milestone|What indexed traversal would require]]
