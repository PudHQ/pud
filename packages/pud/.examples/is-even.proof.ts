import { describe, expect, it, pud } from "@pud.dev/pud";
import { isEven } from "./iff.ts";

describe(isEven, () => {
  it("recognizes exactly the nonnegative multiples of two", {
    value: pud.bigint().gte(0n),
  }, ({ value }) => {
    expect(isEven(value)).to(pud.boolean().eq(pud.modulo(value, 2n) === 0n));
  });
});
