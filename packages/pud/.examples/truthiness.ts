// Adapted from LemmaScript's truthiness.ts. See lemmascript-license.txt.
export function boolCond(value: boolean): bigint {
  if (value) return 1n;
  return 0n;
}

export function numCond(value: bigint): bigint {
  if (value) return 1n;
  return 0n;
}
