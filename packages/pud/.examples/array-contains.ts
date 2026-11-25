// Adapted from LemmaScript's arrayContains.ts. See lemmascript-license.txt.
export function arrayContains(values: readonly bigint[], target: bigint): boolean {
  let found = false;
  for (const value of values) {
    if (value === target) {
      found = true;
      break;
    }
  }
  return found;
}
