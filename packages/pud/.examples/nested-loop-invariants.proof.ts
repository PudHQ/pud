import { lean } from "@pud.dev/lib/lean";
import pud from "./pud.config.ts";
import { nestedSum } from "./nested-loop-invariants.ts";

pud.describe(nestedSum, ({ it, expect, use }) => {
  use(lean.module("./nested-loop-invariants-lemmas.lean"));

  it("counts exactly one visit per ordered pair of positions", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(nestedSum(values)).to(pud.bigint().eq(pud.length(values) * pud.length(values)));
  }).by(lean.ref("NestedSum.correct"));
});
