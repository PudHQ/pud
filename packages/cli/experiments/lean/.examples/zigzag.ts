// Adapted from LemmaScript's zigzag.ts. See lemmascript-license.txt.
export function encode(value: bigint): bigint {
  return value >= 0n ? 2n * value : -2n * value - 1n;
}

export function decode(code: bigint): bigint {
  return code % 2n === 0n ? code / 2n : -((code + 1n) / 2n);
}
