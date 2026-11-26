import { describe, expect, it, pud } from "@pud.dev/lib";
import { toCents } from "./cents.ts";

describe(toCents, () => {
  it("returns the nearest whole cent, with half cents rounded toward positive infinity", {
    amount: pud.number(),
  }, ({ amount }) => {
    expect(toCents(amount)).toExactly(pud.number().nearestIntegerTo(amount * 100, { ties: "up" }));
  });
});
