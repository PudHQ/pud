import { lean } from "@pud.dev/pud/lean";
import pud from "./pud.config.ts";
import { countOdds } from "./for-continue.ts";

pud.describe(countOdds, ({ it, expect, use }) => {
  use(lean.module("./for-continue-lemmas.lean"));

  it("counts the odd elements, including negative odd values", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(countOdds(values)).to(pud.bigint().satisfies(lean.ref("CountOdds.odds", values)));
  }).by(lean.ref("CountOdds.correct"));
});
