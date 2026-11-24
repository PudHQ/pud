import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { maxElement } from "./max-element.ts";

pud.describe(maxElement, ({ it, expect, use }) => {
  use(lean.module("./max-element-lemmas.lean"));

  it("returns the greatest element, or zero for an empty list", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(maxElement(values)).to(pud.bigint()
      .refine(result => pud.forall(values, value => value <= result))
      .refine(result => pud.or(
        pud.and(pud.length(values) === 0n, result === 0n),
        pud.exists(values, value => value === result),
      )));
  }).by(lean.ref("MaxElement.correct"));
});
