import { describe, expect, given, it, lean } from "../authoring.ts";
import { clamp } from "./clamp.ts";

describe(clamp, () => {
  it("keeps the result between ordered bounds", {
    value: lean.int(),
    lower: lean.int(),
    upper: lean.int(),
  }, ({ value, lower, upper }) => {
    given(lower <= upper);
    const result = clamp(value, lower, upper);
    expect(result).to(lean.int().gte(lower).lte(upper));
  });
});
