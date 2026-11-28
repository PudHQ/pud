import { lean } from "pud.dev/lean";
import { countFree } from "./count-free.ts";
import { countFreeReference } from "./count-free-reference.ts";
import pud from "./pud.config.ts";

pud.describe(countFree, ({ it, expect, use }) => {
  use(lean.module("./count-free-lemmas.lean"));
  it("counts available participants exactly across both batches", {
    left: pud.array(pud.bigint()),
    right: pud.array(pud.bigint()),
  }, ({ left, right }) => {
    expect(countFree(left, right)).toEqual(countFreeReference(left, right));
  });
});
