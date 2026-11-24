import { describe, expect, it, lean } from "../authoring.ts";
import { shiftWide } from "./bigint-bits.ts";

describe(shiftWide, () => {
  it("shifts by exactly 70 bits even for negative inputs", {
    value: lean.int(),
  }, ({ value }) => {
    expect(shiftWide(value)).to(lean.int().eq(value * 1180591620717411303424n));
  }).by(lean.inline(`by
  intro value
  rfl`));
});
