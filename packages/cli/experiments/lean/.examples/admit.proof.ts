import { describe, expect, it, lean } from "../authoring.ts";
import { admit } from "./admit.ts";

describe(admit, () => {
  it("accepts valid batches exactly when they fit within 16", {
    used: lean.int().gte(0n),
    batch: lean.int().gt(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(lean.bool().satisfies(lean.inline(
      "fun (used batch : Int) (accepted : Bool) => accepted = decide (used + batch ≤ 16)",
      used, batch,
    )));
  });

  it("rejects a nonpositive batch", {
    used: lean.int(),
    batch: lean.int().lte(0n),
  }, ({ used, batch }) => {
    expect(admit(used, batch)).to(lean.bool().eq(false));
  });
});
