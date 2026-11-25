import { lean } from "@pud.dev/pud/lean";
import pud from "./pud.config.ts";
import { arraySum } from "./array-sum.ts";

pud.describe(arraySum, ({ it, expect, use }) => {
  use(lean.module("./array-sum-lemmas.lean"));

  it("sums every element of the input list", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(arraySum(values)).to(pud.bigint().eq(pud.sum(values)));
  }).by(lean.ref("ArraySum.correct"));
});
