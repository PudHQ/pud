// Adapted from LemmaScript's iff.ts. See lemmascript-license.txt.
export function isEven(value: bigint): boolean {
  return value % 2n === 0n;
}

export function sameParity(left: bigint, right: bigint): boolean {
  return left % 2n === right % 2n;
}
