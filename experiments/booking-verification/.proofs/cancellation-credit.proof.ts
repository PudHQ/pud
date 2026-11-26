import { describe, expect, it, pud } from "@pud.dev/lib";
import { cancellationCredit } from "../rules.ts";

describe(cancellationCredit, () => {
  it("returns the full payment down to and including one day before start", {
    paid: pud.bigint().gte(0n),
    minutesUntilStart: pud.bigint().gte(1440n),
  }, ({ paid, minutesUntilStart }) => {
    expect(cancellationCredit(paid, minutesUntilStart)).to(pud.bigint().eq(paid));
  });

  it("returns half rounded down from an hour until a day before start", {
    paid: pud.bigint().gte(0n),
    minutesUntilStart: pud.bigint().gte(60n).lt(1440n),
  }, ({ paid, minutesUntilStart }) => {
    expect(cancellationCredit(paid, minutesUntilStart)).to(pud.bigint().refine(credit =>
      pud.and(credit * 2n <= paid, credit * 2n + 2n > paid),
    ));
  });

  it("returns zero below an hour, including after start", {
    paid: pud.bigint().gte(0n),
    minutesUntilStart: pud.bigint().lt(60n),
  }, ({ paid, minutesUntilStart }) => {
    expect(cancellationCredit(paid, minutesUntilStart)).to(pud.bigint().eq(0n));
  });
});
