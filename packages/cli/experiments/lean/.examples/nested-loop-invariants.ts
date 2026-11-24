// Adapted from LemmaScript's nestedLoopInvariants.ts. See lemmascript-license.txt.
export function nestedSum(values: readonly bigint[]): bigint {
  let total = 0n;
  for (const _outer of values) {
    for (const _inner of values) {
      total += 1n;
    }
  }
  return total;
}
