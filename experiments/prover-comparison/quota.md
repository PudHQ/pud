# Verifying an export quota with LemmaScript and Pud

A grandfathered account may export a positive batch when its current usage plus the batch is at most 16. The real TypeScript reads its limit from a module-level `bigint` constant. The reviewed rule names 16 independently, so changing the constant can break it.

LemmaScript 0.6.10 verified the original and its algebraic rewrite with Dafny 4.11.0. Both incorrect edits failed the postcondition. The Pud working tree based on `bc1304b` returned `unsupported` at the constant reference in each file. It included uncommitted verifier changes. Inlining the constant's value let Pud prove the same rule. This makes upstream extraction worth trying before adding support for module constants to Pud. The comparison covers one pure function.

| Implementation | Expected under the business rule | LemmaScript + Dafny | Pud | Wrong answers / 68 |
| --- | --- | --- | --- | ---: |
| `batch <= LEGACY_QUOTA - used` | Meets rule | Proved | Unsupported | 0 |
| `used + batch <= LEGACY_QUOTA` | Meets rule | Proved | Unsupported | 0 |
| Strict `<` | Denies exact fits | Unproved | Unsupported | 4 |
| Constant changed to `15n` | Denies exact fits | Unproved | Unsupported | 4 |
| Always refuse, with contradictory preconditions | Denies valid exports | Proved vacuously | Proved vacuously | 58 |
| Original with `16n` inlined | Meets rule | Proved | Proved | 0 |

The 68 real calls cover usage 0–16 and batch size 1–4. At usage 12, both broken edits refuse a batch of four. Bun supplies that witness. The ordinary LemmaScript check reports a generated Dafny postcondition location. The nonvacuous rule asks about every nonnegative `bigint` usage and positive `bigint` batch. The contradictory control admits zero inputs, so its successful proof gives the product owner no assurance.

## Historical reproduction

The trial used a working tree based on `bc1304b`, including uncommitted verifier changes, with Node 22.21.1, Bun 1.4.2, Python 3, and Dafny 4.11.0. The archived reproduction includes the exact sidecars and commands for that checkout. Current projects can run the quota example with the public `pud.dev` runner. [Original reproduction script](https://github.com/PudHQ/pud/blob/8af89706ff8663c107f92fe49461abbf71f25c6d/experiments/prover-comparison/quota.md#historical-reproduction) · [Current quota proof](../../packages/pud/.examples/admit.proof.ts) · [LemmaScript guide at the tested revision](https://github.com/midspiral/LemmaScript/blob/93283ec6f8c7094f0281b7c5f144e619b1f85aea/GETTING_STARTED.md)

Generation succeeded even for both wrong edits. Verification returned `2 verified, 0 errors` on each green LemmaScript run and `1 verified, 1 error` on each red run. No handwritten Dafny additions were needed. In a separate edit loop, `lsc regen --backend=dafny quota.ts` merged the equivalent rewrite and verified it, then rejected the strict comparison. Integration effort, replay support on other constructs and performance remain unmeasured.
