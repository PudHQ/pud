import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { maxElement } from "./max-element.ts";

pud.describe(maxElement, ({ it, expect, use }) => {
  use(lean.module("./max-element-lemmas.lean"));

  it("returns the greatest element, or zero for an empty list", {
    values: pud.array(pud.bigint()),
  }, ({ values }) => {
    expect(maxElement(values)).to(pud.bigint().satisfies(lean`(fun (values : List Int) (result : Int) => result = values.max?.getD 0) ${values}`));
  }).by(lean.ref("MaxElement.correct"));
});
