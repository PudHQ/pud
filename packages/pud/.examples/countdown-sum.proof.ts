import pud from "./pud.config.ts";
import { lean } from "pud.dev/lean";
import { countdownSum } from "./termination.ts";

pud.describe(countdownSum, ({ expect, it, use }) => {
  use(lean.module("./triangular-sum.lean"));

  it("returns zero when the loop guard is false at entry", { value: pud.bigint().lte(0n) }, ({ value }) => {
    expect(countdownSum(value)).to(pud.bigint().eq(0n));
  });

  it("sums every integer from one through the input", { value: pud.bigint().gte(0n) }, ({ value }) => {
    expect(countdownSum(value)).to(pud.bigint().refine(total => 2n * total === value * (value + 1n)));
  }).by(lean`by
    intro value nonnegative
    cases value with
    | negSucc n => omega
    | ofNat value =>
      let run := fun (remaining total : Int) =>
        (countdownWhile (m := Id) remaining 0 1 (by decide) (fun n acc => acc + n) total).2
      have base : ∀ total, run 0 total = total := by
        intro total
        simp [run]
      have step : ∀ (n : Nat) total, run (n + 1) total = run n (total + (n + 1)) := by
        intro n total
        unfold run
        rw [countdownWhile]
        simp
      simpa [run, impl, Id.run] using TriangularSum.accumulating run base step value 0`);
});
