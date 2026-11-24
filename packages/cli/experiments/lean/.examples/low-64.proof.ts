import { describe, expect, it, lean } from "../authoring.ts";
import { low64 } from "./bigint-bits.ts";

describe(low64, () => {
  it("returns exactly the unsigned low 64 bits of a signed input", {
    value: lean.int(),
  }, ({ value }) => {
    expect(low64(value)).to(lean.int().gte(0n).lt(18446744073709551616n).satisfies(lean.inline(
      "fun (value result : Int) => result = value % (2 ^ 64)",
      value,
    )));
  }).by(lean.inline(`by
  intro value
  have positive : (0 : Int) < 18446744073709551616 := by decide
  have nonzero : (18446744073709551616 : Int) ≠ 0 := by decide
  exact ⟨Int.emod_nonneg _ nonzero, Int.emod_lt_of_pos _ positive, rfl⟩`));
});
