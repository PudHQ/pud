export function countBatch(masks: readonly bigint[]): bigint {
  let total = 0n;
  for (const mask of masks) total += mask & 1n;
  return total;
}
