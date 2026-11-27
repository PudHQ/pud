---
author: codex
date: 2026-11-24
updated-at: 2026-11-25
summary: A paid Pud offering that turns existing TypeScript functions into reviewed specs and checks those specs on every pull request.
tags: [product, verification, typescript, codex]
---

# PudCloud

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

PudCloud is Pud’s paid hosted offering. The first feature to try is the **Back-speccer**. Point it at an existing function and get a draft spec that says which inputs it covers, what it promises, and how Pud can check those promises. Start with teams changing business rules in existing TypeScript, where a maintainer can say what should happen but writing a precise, checkable rule takes time.

## From function to merge check

1. **Draft a contract.** Read the export, relevant callers and tests, and any linked ticket or policy. Propose properties with explicit input assumptions. Cite the evidence for each property and flag rules inferred from the implementation alone.
2. **Review the rule.** Replay a concrete input when the code and the draft disagree. When two plausible rules give different answers, show an input that distinguishes them. The maintainer approves or revises the rule and its input domain, or leaves the decision open.
3. **Check it on every PR.** Commit the approved properties as a `*.proof.ts` sidecar. Run `pud check` on the proposed merge and require a pass for properties the team has made mandatory. Show proof status and model limits in the PR, and flag edits to approved rules or their input domains even when the new checks pass. [Pud’s contract-checker alpha](https://github.com/PudHQ/pud/blob/main/experiments/alpha-design/recommendation.md) · [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

## Example of an export quota

Suppose a ticket says customers can use up to 16 units and `admit` rejects any batch that reaches 16 exactly. The Back-speccer shows the reviewer `admit(12n, 4n)` returning `false` and asks whether a batch should succeed when it fills the quota exactly. If the maintainer confirms it should, the spec records the full rule for nonnegative usage and positive batches. [Pud’s quota sidecar](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/admit.proof.ts)

```ts
import { describe, expect, it, pud } from "@pud.dev/lib";
import { admit } from "./admit.ts";

describe(admit, () => {
  it("accepts valid batches exactly when they fit within 16", {
    used: pud.bigint().gte(0n),
    batch: pud.bigint().gt(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(pud.boolean().eq(used + batch <= 16n));
  });
});
```

The reviewer can fix the boundary error and merge with the approved rule in place. With the Lean adapter, a passing check establishes the property for every input in the declared domain within the generated model. [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]

## What teams pay for

PudCloud handles spec drafting, reviews in GitHub, and managed proof runs. Teams own the sidecars in Git and can run them locally or in their own CI with the open-source CLI.

## First pilot

Start with one export on a live PR at a time. Pick deterministic TypeScript functions in Pud’s supported fragment, such as a quota or eligibility decision. Compare time to the first approved property with the team’s usual tests and coding assistant. Check whether the approved property catches a seeded regression and whether the team keeps the check enabled on its next eligible PR.
