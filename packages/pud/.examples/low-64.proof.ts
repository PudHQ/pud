import { describe, expect, it, pud } from "@pud.dev/pud";
import { low64 } from "./bigint-bits.ts";

describe(low64, () => {
  it("returns exactly the unsigned low 64 bits of a signed input", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(low64(value)).to(pud.bigint().gte(0n).lt(1n << 64n).eq(pud.modulo(value, 0x10000000000000000n)));
  });
});
