import { describe, expect, it, lean } from "../authoring.ts";
import { arraySum } from "./array-sum.ts";

describe(arraySum, () => {
  it("sums every element of the input list", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(arraySum(values)).to(lean.int().satisfies(lean.inline(
      "fun (values : List Int) (result : Int) => result = values.sum",
      values,
    )));
  }).by(lean.inline(`by
  intro values
  have foldSum (start : Int) : values.foldl (· + ·) start = start + values.sum := by
    induction values generalizing start with
    | nil => simp
    | cons value rest ih => simp [ih, Int.add_assoc]
  simpa [impl, Id.run] using foldSum 0`));
});
