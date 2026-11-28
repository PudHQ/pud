[![Pud — Proofs for TypeScript](https://raw.githubusercontent.com/PudHQ/pud/8af89706ff8663c107f92fe49461abbf71f25c6d/press/pud-github-social-card.png)](https://pud.dev)

Pud checks properties of TypeScript functions. You write the rule in TypeScript. Pud translates the implementation and the rule into Lean, which can prove the rule for every input in its domain.

[Try it](#try-it) · [Authoring guide](https://github.com/PudHQ/pud/blob/main/packages/pud/guide.md) · [Example suites](https://github.com/PudHQ/pud/tree/main/packages/pud/.examples) · [Website](https://pud.dev)

## A half-cent bug

How many cents is $0.125? With ties rounded toward positive infinity, the answer is 13. Here’s what Pud finds when a rounding function uses `Math.floor(amount * 100)`.

```console
$ npx pud.dev check cents.proof.ts
FAIL       rounds to the nearest cent, with ties up [exact result]  cents.proof.ts:6
   toCents returned 12, violating the result assertion in Bun.
   amount=0.125
```

## Try it

Install Pud in a TypeScript project. The CLI runs on Bun. The example uses Lean 4.19.0. [Install Bun](https://bun.com/docs/installation) · [Install Lean](https://lean-lang.org/install/)

```sh
npm install --save-dev pud.dev
```

With Bun’s package manager, use `bun add -d pud.dev`. If you manage Lean with Elan, run `elan override set leanprover/lean4:v4.19.0` in the project.

### Configure a proof assistant

Create `pud.config.ts`. Enabling replay lets Pud run your function in Bun to look for a counterexample when Lean leaves a claim open.

```ts
import { defineConfig } from "pud.dev";
import { leanAdapter } from "pud.dev/lean";

export default defineConfig({ adapter: leanAdapter({ replay: true }) });
```

### Write the rule

Use `Math.round` in `cents.ts` and put the rule in `cents.proof.ts`, beside it.

```ts
// cents.ts
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
```

```ts
// cents.proof.ts
import { describe, expect, it, pud } from "pud.dev";
import { toCents } from "./cents.ts";

describe(toCents, () => {
  it("rounds to the nearest cent, with ties up", {
    amount: pud.number(),
  }, ({ amount }) => {
    expect(toCents(amount)).toExactly(
      pud.number().nearestIntegerTo(amount * 100, { ties: "up" }),
    );
  });
});
```

```sh
npx pud.dev check cents.proof.ts
```

With that change, Pud reports **1 passed**. Lean proved the rule for every JavaScript number in the adapter’s model. The rule rounds the binary64 product `amount * 100`, including any rounding that happened during multiplication. Swap in `Math.floor` to reproduce the failure above.

## More to prove

- **Find the first match.** Prove that a search returns the earliest matching index, including when a value appears twice. [Linear search walkthrough](https://dex.pud.dev/notes/handbook/engineering/verification/lean/checking-typescript-with-lean/)
- **Check a refactor.** Prove that two implementations give the same result, then see the input that exposes a dropped batch. [Availability tally](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/availability/README.md)
- **Inspect the evidence.** Run `npx pud.dev --emit cents.proof.ts` to read the theorem, or add `--json` to a check for CI. [Reading a proof result](https://dex.pud.dev/notes/handbook/engineering/reading-a-proof-result/)
