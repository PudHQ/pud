import { expect, test } from "vitest";
import { bookingPrice, cancellationCredit, canReserve } from "./rules.ts";

test.each([
  [0n, 1n, false],
  [8n, -1n, false],
  [8n, 0n, false],
  [8n, 1n, true],
  [8n, 8n, true],
  [8n, 9n, false],
] as const)("with %s available, requesting %s returns %s", (available, requested, expected) => {
  expect(canReserve(available, requested)).toBe(expected);
});

test.each([
  [0n, false, 0n],
  [0n, true, 0n],
  [9n, true, 9n],
  [10n, true, 9n],
  [11n, true, 10n],
  [111n, true, 100n],
  [111n, false, 111n],
  [9007199254740997n, true, 8106479329266898n],
] as const)("a subtotal of %s cents with membership %s costs %s", (subtotal, member, expected) => {
  expect(bookingPrice(subtotal, member)).toBe(expected);
});

test.each([
  [1441n, 111n, 111n],
  [1440n, 111n, 111n],
  [1439n, 111n, 55n],
  [61n, 100n, 50n],
  [60n, 111n, 55n],
  [59n, 111n, 0n],
  [0n, 111n, 0n],
  [-1n, 111n, 0n],
  [120n, 0n, 0n],
] as const)("cancelling %s minutes before start with %s paid credits %s", (minutes, paid, expected) => {
  expect(cancellationCredit(paid, minutes)).toBe(expected);
});
