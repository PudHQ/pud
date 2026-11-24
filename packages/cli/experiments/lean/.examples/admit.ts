export const admit = (used: bigint, batch: bigint): boolean =>
  used >= 0n && batch > 0n && used + batch <= 16n;
