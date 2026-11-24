import { describe, expect, it, lean } from "../authoring.ts";
import { sameParity } from "./iff.ts";

describe(sameParity, () => {
  it("returns true exactly when both inputs are even or both are odd", {
    left: lean.int().gte(0n),
    right: lean.int().gte(0n),
  }, ({ left, right }) => {
    expect(sameParity(left, right)).to(lean.bool().satisfies(lean.inline(
      "fun (left right : Int) (result : Bool) => result = true ↔ (left % 2 = 0 ↔ right % 2 = 0)",
      left, right,
    )));
  }).by(lean.inline(`by
  intro left right leftNonnegative rightNonnegative
  simp [impl, Id.run, Int.tmod_eq_emod_of_nonneg leftNonnegative, Int.tmod_eq_emod_of_nonneg rightNonnegative]
  omega`));
});
