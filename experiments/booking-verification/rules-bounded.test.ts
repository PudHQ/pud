import { test } from "vitest";
import { bookingPrice, cancellationCredit, canReserve } from "./rules.ts";

test("seat policy across 66,048 availability and request pairs", () => {
  for (let available = 0n; available <= 255n; available++) {
    for (let requested = -1n; requested <= 256n; requested++) {
      const expected = requested >= 1n && available - requested >= 0n;
      const actual = canReserve(available, requested);
      if (actual !== expected) throw new Error(`available=${available}, requested=${requested}: expected ${expected}, got ${actual}`);
    }
  }
});

test("price policy for 8,192 subtotals with and without membership", () => {
  for (let subtotal = 0n; subtotal <= 8191n; subtotal++) {
    for (const member of [false, true]) {
      const expected = member ? (subtotal * 9n + 9n) / 10n : subtotal;
      const actual = bookingPrice(subtotal, member);
      if (actual !== expected) throw new Error(`subtotal=${subtotal}, member=${member}: expected ${expected}, got ${actual}`);
    }
  }
});

test("refund policy across 430,336 payment and time pairs", () => {
  for (let paid = 0n; paid <= 255n; paid++) {
    for (let minutes = -120n; minutes <= 1560n; minutes++) {
      const expected = minutes < 60n ? 0n : minutes < 1440n ? paid / 2n : paid;
      const actual = cancellationCredit(paid, minutes);
      if (actual !== expected) throw new Error(`paid=${paid}, minutes=${minutes}: expected ${expected}, got ${actual}`);
    }
  }
});
