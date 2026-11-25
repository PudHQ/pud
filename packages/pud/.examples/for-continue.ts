// Adapted from LemmaScript's forContinue.ts. See lemmascript-license.txt.
export function countOdds(values: readonly bigint[]): bigint {
  let count = 0n;
  for (const value of values) {
    if (value % 2n === 0n) continue;
    count += 1n;
  }
  return count;
}
