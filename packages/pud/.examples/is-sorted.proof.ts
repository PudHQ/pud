import { lean } from "@pud.dev/lib/lean";
import pud from "./pud.config.ts";
import { isSorted } from "./is-sorted.ts";

pud.describe(isSorted, ({ it, expect, use }) => {
  use(lean.module("./is-sorted-lemmas.lean"));

  it("returns true exactly when every adjacent pair is nondecreasing", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(isSorted(values)).to(pud.boolean().satisfies(lean.ref("Sorted.adjacentPairs", values)));
  }).by(lean.ref("Sorted.correct"));
});
