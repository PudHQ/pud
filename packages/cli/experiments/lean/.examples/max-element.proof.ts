import { describe, expect, it, lean } from "../authoring.ts";
import { maxElement } from "./max-element.ts";

lean.use("./max-element-lemmas.lean");

describe(maxElement, () => {
  it("returns the greatest element, or zero for an empty list", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(maxElement(values)).to(lean.int().satisfies(lean.inline(
      "fun (values : List Int) (result : Int) => result = values.max?.getD 0",
      values,
    )));
  }).by(lean.ref("MaxElement.correct"));
});
