import { describe, expect, it, lean } from "../authoring.ts";
import { sumPositive } from "./sum-positive.ts";

lean.use("./sum-positive-lemmas.lean");

describe(sumPositive, () => {
  it("returns a nonnegative total for every input list", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(sumPositive(values)).to(lean.int().gte(0n));
  }).by(lean.ref("PositiveSum.nonnegative"));

  it.todo("adding a nonpositive element leaves the sum unchanged");
});
