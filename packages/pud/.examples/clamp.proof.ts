import { describe, expect, given, it, pud } from "@pud.dev/lib";
import { clamp } from "./clamp.ts";

describe(clamp, () => {
  it("keeps the result between ordered bounds", {
    value: pud.bigint(),
    lower: pud.bigint(),
    upper: pud.bigint(),
  }, ({ value, lower, upper }) => {
    given(lower <= upper);
    const result = clamp(value, lower, upper);
    expect(result).to(pud.bigint().gte(lower).lte(upper));
  });
});
