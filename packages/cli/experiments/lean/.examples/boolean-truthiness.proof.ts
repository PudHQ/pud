import { describe, expect, it, pud } from "@pud/cli";
import { boolCond } from "./truthiness.ts";

describe(boolCond, () => {
  it("converts true to one and false to zero", {
    value: pud.boolean(),
  }, ({ value }) => {
    expect(boolCond(value)).to(pud.bigint().eq(value ? 1n : 0n));
  });
});
