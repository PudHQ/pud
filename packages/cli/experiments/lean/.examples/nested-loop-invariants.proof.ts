import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { nestedSum } from "./nested-loop-invariants.ts";

pud.describe(nestedSum, ({ it, expect, use }) => {
  use(lean.module("./nested-loop-invariants-lemmas.lean"));

  it("counts exactly one visit per ordered pair of positions", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(nestedSum(values)).to(pud.bigint().satisfies(lean`(fun (values : List Int) (result : Int) => result = (values.length : Int) ^ 2) ${values}`));
  }).by(lean.ref("NestedSum.correct"));
});
