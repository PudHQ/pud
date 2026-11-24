import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { decode } from "./zigzag.ts";

pud.describe(decode, ({ it, expect, use }) => {
  use(lean.module("./zigzag-spec.lean"));

  it("returns the signed integer represented by a nonnegative code", {
    code: pud.bigint().gte(0n),
  }, ({ code }) => {
    expect(decode(code)).to(pud.bigint().satisfies(lean`(fun (code result : Int) => ZigZag.represents result code) ${code}`));
  }).by(lean`by
  intro code nonnegative
  have nextNonnegative : 0 ≤ code + 1 := by omega
  simp [ZigZag.represents, impl, Id.run, Int.tmod_eq_emod_of_nonneg nonnegative,
    Int.tdiv_eq_ediv_of_nonneg nonnegative, Int.tdiv_eq_ediv_of_nonneg nextNonnegative]
  split <;> omega`);
});
