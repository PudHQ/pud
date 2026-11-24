import { describe, expect, given, it, pud } from "@pud/cli";
import { divideOrZero } from "./safe-quotient.ts";

describe(divideOrZero, () => {
  it("returns the truncated quotient for every nonzero divisor", {
    numerator: pud.bigint(), divisor: pud.bigint(),
  }, ({ numerator, divisor }) => {
    given(divisor !== 0n);
    expect(divideOrZero(numerator, divisor)).to(pud.bigint().eq(pud.quotient(numerator, divisor)));
  });

  it("returns zero after catching division by zero", {
    numerator: pud.bigint(), divisor: pud.bigint().eq(0n),
  }, ({ numerator, divisor }) => {
    expect(divideOrZero(numerator, divisor)).to(pud.bigint().eq(0n));
  });
});
