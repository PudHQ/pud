import { describe, expect, it, pud } from "@pud.dev/pud";
import { countdownSum } from "./termination.ts";

describe(countdownSum, () => {
  it("returns zero when the loop guard is false at entry", { value: pud.bigint().lte(0n) }, ({ value }) => {
    expect(countdownSum(value)).to(pud.bigint().eq(0n));
  });

  it("sums the five positive values from five down to one", { value: pud.bigint().eq(5n) }, ({ value }) => {
    expect(countdownSum(value)).to(pud.bigint().eq(15n));
  });
});
