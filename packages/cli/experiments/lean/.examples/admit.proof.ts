import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { admit } from "./admit.ts";

pud.describe(admit, ({ it, expect }) => {
  it("accepts valid batches exactly when they fit within 16", {
    used: pud.bigint().gte(0n),
    batch: pud.bigint().gt(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(pud.boolean().satisfies(
      lean`fun (accepted : Bool) => accepted = decide (${used} + ${batch} ≤ 16)`,
    ));
  });

  it("rejects a nonpositive batch", {
    used: pud.bigint(),
    batch: pud.bigint().lte(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(pud.boolean().eq(false));
  });
});
