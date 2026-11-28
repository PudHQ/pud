import { describe, expect, it, pud } from "pud.dev";
import { shiftWide } from "./bigint-bits.ts";

describe(shiftWide, () => {
  it("shifts by exactly 70 bits even for negative inputs", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(shiftWide(value)).to(pud.bigint().eq(value * 1180591620717411303424n));
  });
});
