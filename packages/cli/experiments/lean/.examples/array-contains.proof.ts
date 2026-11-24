import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { arrayContains } from "./array-contains.ts";

pud.describe(arrayContains, ({ it, expect, use }) => {
  use(lean.module("./array-contains-lemmas.lean"));

  it("returns true exactly when the target occurs in the list", {
    values: pud.array(pud.bigint()),
    target: pud.bigint(),
  }, ({ values, target }) => {
    expect(arrayContains(values, target)).to(pud.boolean().refine(result =>
      pud.iff(result, pud.exists(values, value => value === target)),
    ));
  }).by(lean.ref("ArrayContains.correct"));
});
