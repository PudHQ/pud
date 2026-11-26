import { describe, expect, it, pud } from "@pud.dev/lib";
import { canReserve } from "../rules.ts";

describe(canReserve, () => {
  it("accepts exactly positive requests that leave nonnegative inventory", {
    available: pud.bigint().gte(0n),
    requested: pud.bigint(),
  }, ({ available, requested }) => {
    expect(canReserve(available, requested)).to(pud.boolean().refine(accepted =>
      pud.iff(accepted, pud.and(requested >= 1n, available - requested >= 0n)),
    ));
  });
});
