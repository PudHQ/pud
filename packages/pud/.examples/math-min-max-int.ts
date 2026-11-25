// Adapted from LemmaScript's mathMinMaxInt.ts. See lemmascript-license.txt.
export function highestInteger(a: bigint, b: bigint, c: bigint): bigint {
  const first = a > b ? a : b;
  return first > c ? first : c;
}
