export function reserveSeats(available: bigint, requested: bigint): bigint {
  if (requested <= 0n || requested > available) return available;
  const remaining = available - requested;
  return remaining;
}
