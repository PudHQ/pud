export function countdownSum(value: bigint): bigint {
  let remaining = value;
  let total = 0n;
  while (remaining > 0n) {
    total += remaining;
    remaining -= 1n;
  }
  return total;
}

export function recursiveSum(value: bigint): bigint {
  if (value <= 0n) return 0n;
  return value + recursiveSum(value - 1n);
}
