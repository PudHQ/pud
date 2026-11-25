import { lean } from "@pud.dev/pud/lean";
import pud from "./pud.config.ts";
import { linearSearch } from "./linear-search.ts";

pud.describe(linearSearch, ({ it, expect, use }) => {
  use(lean.module("./linear-search-lemmas.lean"));

  it("returns the first matching index or minus one", {
    values: pud.array(pud.bigint()),
    target: pud.bigint(),
  }, ({ values, target }) => {
    expect(linearSearch(values, target)).to(pud.bigint().satisfies(lean.ref("LinearSearch.firstMatch", values, target)));
  }).by(lean.ref("LinearSearch.correct"));
});
