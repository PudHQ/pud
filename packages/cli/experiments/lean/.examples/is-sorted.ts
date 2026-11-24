// Adapted from LemmaScript's isSorted.ts. See lemmascript-license.txt.
export function isSorted(values: readonly bigint[]): boolean {
  let previous = 0n;
  let started = false;
  for (const value of values) {
    if (started && value < previous) return false;
    previous = value;
    started = true;
  }
  return true;
}
