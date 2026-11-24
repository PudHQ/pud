import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { arraySum } from "./array-sum.ts";

pud.describe(arraySum, ({ it, expect }) => {
  it("sums every element of the input list", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(arraySum(values)).to(pud.bigint().satisfies(lean`(fun (values : List Int) (result : Int) => result = values.sum) ${values}`));
  }).by(lean`by
  intro values
  have foldSum (start : Int) : values.foldl (· + ·) start = start + values.sum := by
    induction values generalizing start with
    | nil => simp
    | cons value rest ih => simp [ih, Int.add_assoc]
  simpa [impl, Id.run] using foldSum 0`);
});
