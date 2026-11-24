import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { highestInteger } from "./math-min-max-int.ts";

pud.describe(highestInteger, ({ it, expect }) => {
  it("returns one of the three inputs and is at least as large as all of them", {
    a: pud.bigint(),
    b: pud.bigint(),
    c: pud.bigint(),
  }, ({ a, b, c }) => {
    expect(highestInteger(a, b, c)).to(pud.bigint().gte(a).gte(b).gte(c).satisfies(lean`(fun (a b c result : Int) => result = a ∨ result = b ∨ result = c) ${a} ${b} ${c}`));
  }).by(lean`by
  intro a b c
  by_cases ab : b < a <;> by_cases ac : c < a <;> by_cases bc : c < b <;>
    simp [impl, Id.run, ab, ac, bc] <;> omega`);
});
