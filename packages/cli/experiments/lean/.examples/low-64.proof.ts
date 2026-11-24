import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { low64 } from "./bigint-bits.ts";

pud.describe(low64, ({ it, expect }) => {
  it("returns exactly the unsigned low 64 bits of a signed input", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(low64(value)).to(pud.bigint().gte(0n).lt(18446744073709551616n).satisfies(
      lean`fun (result : Int) => result = ${value} % (2 ^ 64)`,
    ));
  }).by(lean`by
  intro value
  have positive : (0 : Int) < 18446744073709551616 := by decide
  have nonzero : (18446744073709551616 : Int) ≠ 0 := by decide
  exact ⟨Int.emod_nonneg _ nonzero, Int.emod_lt_of_pos _ positive, rfl⟩`);
});
