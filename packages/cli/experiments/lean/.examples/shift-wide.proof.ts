import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { shiftWide } from "./bigint-bits.ts";

pud.describe(shiftWide, ({ it, expect }) => {
  it("shifts by exactly 70 bits even for negative inputs", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(shiftWide(value)).to(pud.bigint().eq(value * 1180591620717411303424n));
  }).by(lean`by
  intro value
  rfl`);
});
