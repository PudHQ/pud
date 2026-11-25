import { describe, expect, it, pud } from "@pud.dev/lib";
import { recursiveSum } from "./termination.ts";

describe(recursiveSum, () => {
  it("returns zero in the base case", { value: pud.bigint().lte(0n) }, ({ value }) => {
    expect(recursiveSum(value)).to(pud.bigint().eq(0n));
  });

  it("sums the five positive values from five down to one", { value: pud.bigint().eq(5n) }, ({ value }) => {
    expect(recursiveSum(value)).to(pud.bigint().eq(15n));
  });
});
