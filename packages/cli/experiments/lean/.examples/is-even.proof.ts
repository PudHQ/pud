import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { isEven } from "./iff.ts";

pud.describe(isEven, ({ it, expect }) => {
  it("recognizes exactly the nonnegative multiples of two", {
    value: pud.bigint().gte(0n),
  }, ({ value }) => {
    expect(isEven(value)).to(pud.boolean().satisfies(lean`(fun (value : Int) (result : Bool) => result = true ↔ value % 2 = 0) ${value}`));
  }).by(lean`by
  intro value nonnegative
  simp [impl, Id.run, Int.tmod_eq_emod_of_nonneg nonnegative]`);
});
