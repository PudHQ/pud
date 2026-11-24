export function sumPositive(values: readonly bigint[]): bigint {
  let total = 0n;
  for (const value of values) {
    total += value > 0n ? value : 0n;
  }
  return total;
}
