// Adapted from LemmaScript's maxElement.ts. See lemmascript-license.txt.
export function maxElement(values: readonly bigint[]): bigint {
  let largest = 0n;
  let started = false;
  for (const value of values) {
    if (!started || value > largest) {
      largest = value;
    }
    started = true;
  }
  return largest;
}
