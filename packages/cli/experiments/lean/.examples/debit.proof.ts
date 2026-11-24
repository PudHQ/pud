import { describe, expect, given, it, lean } from "../authoring.ts";
import { debit } from "./debit.ts";

describe(debit, () => {
  it("keeps a nonnegative balance between zero and its starting value", {
    balance: lean.int().gte(0n),
    amount: lean.int(),
  }, ({ balance, amount }) => {
    expect(debit(balance, amount)).to(lean.int().gte(0n).lte(balance));
  });

  it("deducts the full amount when an affordable charge is positive", {
    balance: lean.int(),
    amount: lean.int().gt(0n),
  }, ({ balance, amount }) => {
    given(amount <= balance);
    expect(debit(balance, amount)).to(lean.int().eq(balance - amount));
  });
});
