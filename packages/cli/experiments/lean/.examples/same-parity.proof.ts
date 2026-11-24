import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { sameParity } from "./iff.ts";

pud.describe(sameParity, ({ it, expect }) => {
  it("returns true exactly when both inputs are even or both are odd", {
    left: pud.bigint().gte(0n),
    right: pud.bigint().gte(0n),
  }, ({ left, right }) => {
    expect(sameParity(left, right)).to(pud.boolean().satisfies(lean`(fun (left right : Int) (result : Bool) => result = true ↔ (left % 2 = 0 ↔ right % 2 = 0)) ${left} ${right}`));
  }).by(lean`by
  intro left right leftNonnegative rightNonnegative
  simp [impl, Id.run, Int.tmod_eq_emod_of_nonneg leftNonnegative, Int.tmod_eq_emod_of_nonneg rightNonnegative]
  omega`);
});
