import { describe, expect, it, lean } from "../authoring.ts";
import { decode } from "./zigzag.ts";

lean.use("./zigzag-spec.lean");

describe(decode, () => {
  it("returns the signed integer represented by a nonnegative code", {
    code: lean.int().gte(0n),
  }, ({ code }) => {
    expect(decode(code)).to(lean.int().satisfies(lean.inline(
      "fun (code result : Int) => ZigZag.represents result code",
      code,
    )));
  }).by(lean.inline(`by
  intro code nonnegative
  have nextNonnegative : 0 ≤ code + 1 := by omega
  simp [ZigZag.represents, impl, Id.run, Int.tmod_eq_emod_of_nonneg nonnegative,
    Int.tdiv_eq_ediv_of_nonneg nonnegative, Int.tdiv_eq_ediv_of_nonneg nextNonnegative]
  split <;> omega`));
});
