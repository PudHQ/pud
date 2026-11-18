# Replaying one TypeScript property in Rocq and Dafny

For `bigint` arguments `a` and `b` and result `r`, the reviewed property is `r >= a && r >= b && (r === a || r === b)`.

Install the repository's Bun dependencies and run the comparison from its root with Python 3, Rocq and Dafny on your path.

```sh
python3 experiments/prover-comparison/run.py
```

You can also set `ROCQ` and `DAFNY` to absolute executable paths. Each trial uses a temporary copy of the demo TypeScript and its reviewed manifest. The script calls `pud --emit` and compiles the resulting Rocq claim directly. It generates the Dafny comparison and return branches from the same operands, with the reviewed predicate as the postcondition. It checks for changes to the fixture before using this one-function Dafny translation.

| Implementation | Rocq 9.3.0 | Dafny 4.11.0 |
| --- | --- | --- |
| Original `a < b ? b : a` | Proved | Proved |
| Equivalent `b < a ? a : b`, replay original proof | Unproved | Proved |
| Equivalent, after one proof edit | Proved | Proved unchanged |
| Broken `a < b ? a : b`, replay original proof | Unproved | Unproved |
| Broken, replay final proof | Unproved | Unproved |

Two independent agents using the same model received one prover each. Each had up to two baseline candidates, one repair attempt, and a 30-second checker limit per invocation. Both solved the baseline on their first attempt. The equivalent implementation was withheld until the baseline was complete. Both original proofs were then replayed and the agents received no repair hints.

The Rocq agent repaired the proof on its first try by changing the split from `Z.ltb x y` to `Z.ltb y x`. Dafny discharged both correct implementations from the postcondition alone. [Original Rocq proof](OriginalProof.v) · [Agent's repair](Proof.v)

We subsequently checked the broken case directly with both compilers, independently of the CLI's counterexample search. For `(1n, 2n)` the broken implementation returns `1n`, violating `r >= b`.

This trial covers one function, one predicate and one independent author per prover. It measures how these particular proofs survived an edit. Cost, latency, performance on other TypeScript code and general agent success rates remain unmeasured. The replay script requires no agent.
