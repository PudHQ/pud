import { describe, expect, it, lean } from "../authoring.ts";
import { isEven } from "./iff.ts";

describe(isEven, () => {
  it("recognizes exactly the nonnegative multiples of two", {
    value: lean.int().gte(0n),
  }, ({ value }) => {
    expect(isEven(value)).to(lean.bool().satisfies(lean.inline(
      "fun (value : Int) (result : Bool) => result = true ↔ value % 2 = 0",
      value,
    )));
  }).by(lean.inline(`by
  intro value nonnegative
  simp [impl, Id.run, Int.tmod_eq_emod_of_nonneg nonnegative]`));
});
