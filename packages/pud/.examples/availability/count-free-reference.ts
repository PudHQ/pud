function countOneBatch(masks: readonly bigint[]): bigint {
  let free = 0n;
  for (const mask of masks) free += (mask & 1n) === 1n ? 1n : 0n;
  return free;
}

export function countFreeReference(left: readonly bigint[], right: readonly bigint[]): bigint {
  return countOneBatch(left) + countOneBatch(right);
}
