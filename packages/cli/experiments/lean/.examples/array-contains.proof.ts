import { describe, expect, it, lean } from "../authoring.ts";
import { arrayContains } from "./array-contains.ts";

lean.use("./array-contains-lemmas.lean");

describe(arrayContains, () => {
  it("returns true exactly when the target occurs in the list", {
    values: lean.array(lean.int()),
    target: lean.int(),
  }, ({ values, target }) => {
    expect(arrayContains(values, target)).to(lean.bool().satisfies(lean.inline(
      "fun (values : List Int) (target : Int) (result : Bool) => result = true ↔ target ∈ values",
      values, target,
    )));
  }).by(lean.ref("ArrayContains.correct"));
});
