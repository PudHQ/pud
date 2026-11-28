import { describe, expect, it, pud } from "pud.dev";
import { bookingPrice } from "../rules.ts";

describe(bookingPrice, () => {
  it("charges the full subtotal to nonmembers", {
    subtotal: pud.bigint().gte(0n),
    member: pud.boolean().eq(false),
  }, ({ subtotal, member }) => {
    expect(bookingPrice(subtotal, member)).to(pud.bigint().eq(subtotal));
  });

  it("charges members 90 percent, rounded up to the next cent", {
    subtotal: pud.bigint().gte(0n),
    member: pud.boolean().eq(true),
  }, ({ subtotal, member }) => {
    expect(bookingPrice(subtotal, member)).to(pud.bigint().refine(charged =>
      pud.and(charged * 10n >= subtotal * 9n, charged * 10n < subtotal * 9n + 10n),
    ));
  });
});
