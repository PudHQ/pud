import { describe, expect, it, lean } from "../authoring.ts";
import { highestInteger } from "./math-min-max-int.ts";

describe(highestInteger, () => {
  it("returns one of the three inputs and is at least as large as all of them", {
    a: lean.int(),
    b: lean.int(),
    c: lean.int(),
  }, ({ a, b, c }) => {
    expect(highestInteger(a, b, c)).to(lean.int().gte(a).gte(b).gte(c).satisfies(lean.inline(
      "fun (a b c result : Int) => result = a ∨ result = b ∨ result = c",
      a, b, c,
    )));
  }).by(lean.inline(`by
  intro a b c
  by_cases ab : b < a <;> by_cases ac : c < a <;> by_cases bc : c < b <;>
    simp [impl, Id.run, ab, ac, bc] <;> omega`));
});
