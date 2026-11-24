import { describe, expect, it, lean } from "../authoring.ts";
import { linearSearch } from "./linear-search.ts";

lean.use("./linear-search-lemmas.lean");

describe(linearSearch, () => {
  it("returns the first matching index or minus one", {
    values: lean.array(lean.int()),
    target: lean.int(),
  }, ({ values, target }) => {
    expect(linearSearch(values, target)).to(lean.int().satisfies(lean.ref("LinearSearch.firstMatch", values, target)));
  }).by(lean.ref("LinearSearch.correct"));
});
