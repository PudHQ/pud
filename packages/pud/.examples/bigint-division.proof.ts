import { describe, expect, given, it, pud } from "pud.dev";
import { divide } from "./bigint-division.ts";

describe(divide, () => {
  it("returns a quotient truncated toward zero for every nonzero divisor", {
    numerator: pud.bigint(), divisor: pud.bigint(),
  }, ({ numerator, divisor }) => {
    given(divisor !== 0n);
    expect(divide(numerator, divisor)).to(pud.bigint().eq(pud.quotient(numerator, divisor)));
  });

  it("throws a RangeError at zero for every numerator", {
    numerator: pud.bigint(), divisor: pud.bigint().eq(0n),
  }, ({ numerator, divisor }) => {
    expect(() => divide(numerator, divisor)).toThrow("RangeError");
  });
});
