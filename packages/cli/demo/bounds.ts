export function max(a: bigint, b: bigint): bigint {
  return a < b ? b : a;
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
