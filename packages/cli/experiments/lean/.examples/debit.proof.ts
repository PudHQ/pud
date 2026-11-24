import { describe, expect, given, it, pud } from "@pud/cli";
import { debit } from "./debit.ts";

describe(debit, () => {
  it("keeps a nonnegative balance between zero and its starting value", {
    balance: pud.bigint().gte(0n),
    amount: pud.bigint(),
  }, ({ balance, amount }) => {
    expect(debit(balance, amount)).to(pud.bigint().gte(0n).lte(balance));
  });

  it("deducts the full amount when an affordable charge is positive", {
    balance: pud.bigint(),
    amount: pud.bigint().gt(0n),
  }, ({ balance, amount }) => {
    given(amount <= balance);
    expect(debit(balance, amount)).to(pud.bigint().eq(balance - amount));
  });
});
