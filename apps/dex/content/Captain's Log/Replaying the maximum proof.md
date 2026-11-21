---
author: rorz
summary: What happened when the comparison in a two-line maximum function changed.
tags: [experiment, rocq, dafny]
---
# Replaying the maximum proof

The experiment held one claim fixed. The result of `max(a, b)` must be at least as large as both inputs and equal to one of them.

Changing `a < b ? b : a` to `b < a ? a : b` preserved the answer. Dafny still proved the claim. The original Rocq proof split on the old comparison, so it needed one corresponding edit.

Changing the function to return the smaller input broke the claim. With `1n` and `2n` the function returned `1n`. That gives [[Reading a proof result#Read the witness|a concrete witness]].

The comparison lives in `experiments/prover-comparison/` in the Pud repository. The [[Dafny reference manual]] describes the postcondition language used in the experiment.
