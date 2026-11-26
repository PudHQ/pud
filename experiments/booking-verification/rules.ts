export function canReserve(available: bigint, requested: bigint): boolean {
  return requested > 0n && requested <= available;
}

export function bookingPrice(subtotal: bigint, member: boolean): bigint {
  if (member) return subtotal - subtotal / 10n;
  return subtotal;
}

export function cancellationCredit(paid: bigint, minutesUntilStart: bigint): bigint {
  if (minutesUntilStart >= 1440n) return paid;
  if (minutesUntilStart >= 60n) return paid / 2n;
  return 0n;
}
