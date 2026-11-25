import { describe, expect, it, pud } from "@pud.dev/lib";
import { admit } from "./admit.ts";

describe(admit, () => {
  it("accepts valid batches exactly when they fit within 16", {
    used: pud.bigint().gte(0n),
    batch: pud.bigint().gt(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(pud.boolean().eq(used + batch <= 16n));
  });

  it("rejects a nonpositive batch", {
    used: pud.bigint(),
    batch: pud.bigint().lte(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(pud.boolean().eq(false));
  });
});
