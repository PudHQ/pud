import { describe, expect, it, lean } from "../authoring.ts";
import { numCond } from "./truthiness.ts";

describe(numCond, () => {
  it("converts zero to zero and every nonzero bigint to one", {
    value: lean.int(),
  }, ({ value }) => {
    expect(numCond(value)).to(lean.int().satisfies(lean.inline(
      "fun (value result : Int) => result = if value = 0 then 0 else 1",
      value,
    )));
  });
});
