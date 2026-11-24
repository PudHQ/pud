import { describe, expect, it, lean } from "../authoring.ts";
import { countOdds } from "./for-continue.ts";

lean.use("./for-continue-lemmas.lean");

describe(countOdds, () => {
  it("counts the odd elements, including negative odd values", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(countOdds(values)).to(lean.int().satisfies(lean.ref("CountOdds.odds", values)));
  }).by(lean.ref("CountOdds.correct"));
});
