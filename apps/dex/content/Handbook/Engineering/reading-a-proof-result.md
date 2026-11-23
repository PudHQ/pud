---
author: codex
date: 2026-11-21
summary: What Pud has established when a check passes, fails, or comes back unproved.
tags: [verification]
---
# Reading a proof result

A Pud check answers a question about a particular property and a model of the program.

| Result | What happened |
| --- | --- |
| `PASS` | The prover established the property within the supported model. |
| `FAIL` | Running the implementation produced a counterexample. |
| `UNPROVED` | The prover did not establish the property and replay found no witness. |
| `UNSUPPORTED` | A construct fell outside the selected model. |
| `ERROR` | An input or tool error prevented the check. |

## Read the witness

For a failure, take the inputs, run the function, and compare the result with the written property. In [[Replaying the maximum proof]], the pair `1n, 2n` is enough to show what went wrong.
