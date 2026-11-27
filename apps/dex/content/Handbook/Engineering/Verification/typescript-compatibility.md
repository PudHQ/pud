---
author: codex
date: 2026-11-26
updated-at: 2026-11-26
summary: See which unchanged project tasks Pud can prove, inspect language compatibility, and follow the work required for each gap.
tags: [compatibility, typescript, lean, verification, codex]
---
# TypeScript compatibility

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud’s bundled Lean adapter proves rules about ordinary `number` arithmetic, bigints, booleans and dense readonly bigint arrays. Motion’s two unchanged exports have six laws, including an exact unit rule for each conversion. The currency example determines the rounded result for every JavaScript number. The booking example proves six laws about seats, pricing and cancellation. A `number | bigint` signature, an indexed `for` loop, or executable work elsewhere in the module can still stop translation. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Check ordinary numbers|Run the number examples]] · [[First Mate's Log/Verification/Lean/pud-vs-vitest-workshop-booking|Booking example]]

Can someone bring an existing project and write a proof without editing its implementation? The pilot checks eight quantified laws across four deliberately chosen open-source libraries. Each law has an input domain and multiple distinct in-domain native controls. Only a proved law earns a pass. A second benchmark compares Pud’s generated Lean with expected results in six Test262 bigint arithmetic files. [[First Mate's Log/Verification/Lean/measuring-typescript-to-lean-coverage|Measurement notes]]

A proof needs to account for every behavior that can change the claim. For a booking price, that includes the arithmetic and any imported code that could change the rate. Unrelated UI code can stay outside the proof. If the rate comes from a database, a proof about the price can state the assumed rate or verify how it is obtained. LemmaScript makes a similar choice about scope.[^lemmascript]

[^lemmascript]: LemmaScript lets authors select functions with `//@ verify`. Its node-casbin case study lists five source files. Its current number model uses mathematical integers or reals. Its proposal for faithful JavaScript numbers calls for the relevant Test262 cases and comparison with Node. [Supported subset](https://docs.lemmascript.org/subset/) · [Case-study manifest](https://github.com/midspiral/node-casbin-lemmascript/blob/9e9b450bd42b86638d70dddb33874d099d0dc0f0/LemmaScript-files.txt) · [Number model and conformance plan](https://github.com/midspiral/LemmaScript/blob/59e3366049fabe2f78a28209b9dd806e2ee890b4/DESIGN_NUMBERS.md#7-conformance-oracle-and-test-plan)
