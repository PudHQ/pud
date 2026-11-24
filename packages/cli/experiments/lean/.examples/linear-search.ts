// Adapted from LemmaScript's linearSearch.ts. See lemmascript-license.txt.
export function linearSearch(values: readonly bigint[], target: bigint): bigint {
  let index = 0n;
  for (const value of values) {
    if (value === target) return index;
    index += 1n;
  }
  return -1n;
}
