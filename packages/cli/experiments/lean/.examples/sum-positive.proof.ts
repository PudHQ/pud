import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { sumPositive } from "./sum-positive.ts";

pud.describe(sumPositive, ({ it, expect, use }) => {
  use(lean.module("./sum-positive-lemmas.lean"));

  it("returns a nonnegative total for every input list", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(sumPositive(values)).to(pud.bigint().gte(0n));
  }).by(lean.ref("PositiveSum.nonnegative"));

  it.todo("adding a nonpositive element leaves the sum unchanged");
});
