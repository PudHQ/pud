import pud from "./pud.config.ts";
import { lean } from "@pud.dev/lib/lean";
import { recursiveSum } from "./termination.ts";

pud.describe(recursiveSum, ({ expect, it, use }) => {
  use(lean.module("./triangular-sum.lean"));

  it("returns zero in the base case", { value: pud.bigint().lte(0n) }, ({ value }) => {
    expect(recursiveSum(value)).to(pud.bigint().eq(0n));
  });

  it("sums every integer from one through the input", { value: pud.bigint().gte(0n) }, ({ value }) => {
    expect(recursiveSum(value)).to(pud.bigint().refine(total => 2n * total === value * (value + 1n)));
  }).by(lean`by
    intro value nonnegative
    cases value with
    | negSucc n => omega
    | ofNat value =>
      apply TriangularSum.recursive impl
      · rw [impl]; rfl
      · intro n
        rw [impl]; simp [Id.run]; omega`);
});
