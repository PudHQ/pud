import { describe, expect, it, lean } from "../authoring.ts";
import { boolCond } from "./truthiness.ts";

describe(boolCond, () => {
  it("converts true to one and false to zero", {
    value: lean.bool(),
  }, ({ value }) => {
    expect(boolCond(value)).to(lean.int().satisfies(lean.inline(
      "fun (value : Bool) (result : Int) => result = if value then 1 else 0",
      value,
    )));
  });
});
