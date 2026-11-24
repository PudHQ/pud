import { describe, expect, it, lean } from "../authoring.ts";
import { isSorted } from "./is-sorted.ts";

lean.use("./is-sorted-lemmas.lean");

describe(isSorted, () => {
  it("returns true exactly when every adjacent pair is nondecreasing", {
    values: lean.array(lean.int()),
  }, ({ values }) => {
    expect(isSorted(values)).to(lean.bool().satisfies(lean.ref("Sorted.adjacentPairs", values)));
  }).by(lean.ref("Sorted.correct"));
});
