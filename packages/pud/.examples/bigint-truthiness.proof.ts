import { describe, expect, it, pud } from "@pud.dev/lib";
import { numCond } from "./truthiness.ts";

describe(numCond, () => {
  it("converts zero to zero and every nonzero bigint to one", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(numCond(value)).to(pud.bigint().eq(value === 0n ? 0n : 1n));
  });
});
