import { describe, expect, it, pud } from "@pud.dev/lib";
import { sameParity } from "./iff.ts";

describe(sameParity, () => {
  it("returns true exactly when both inputs are even or both are odd", {
    left: pud.bigint().gte(0n),
    right: pud.bigint().gte(0n),
  }, ({ left, right }) => {
    expect(sameParity(left, right)).to(pud.boolean().refine(result =>
      pud.iff(result, pud.iff(pud.modulo(left, 2n) === 0n, pud.modulo(right, 2n) === 0n)),
    ));
  });
});
