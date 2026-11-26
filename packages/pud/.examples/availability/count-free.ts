export function countFree(left: readonly bigint[], right: readonly bigint[]): bigint {
  let total = 0n;
  for (const mask of left) total += mask & 1n;
  for (const mask of right) total += mask & 1n;
  return total;
}
