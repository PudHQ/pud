import { describe, expect, it, lean } from "../authoring.ts";
import { nestedSum } from "./nested-loop-invariants.ts";

lean.use("./nested-loop-invariants-lemmas.lean");

describe(nestedSum, () => {
  it("counts exactly one visit per ordered pair of positions", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(nestedSum(values)).to(lean.int().satisfies(lean.inline(
      "fun (values : List Int) (result : Int) => result = (values.length : Int) ^ 2",
      values,
    )));
  }).by(lean.ref("NestedSum.correct"));
});
