// Adapted from LemmaScript's arraySum.ts. See lemmascript-license.txt.
export function arraySum(values: readonly bigint[]): bigint {
  let sum = 0n;
  for (const value of values) {
    sum += value;
  }
  return sum;
}
