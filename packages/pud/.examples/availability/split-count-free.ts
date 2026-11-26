import { countBatch } from "./count-batch";

export function countFree(left: readonly bigint[], right: readonly bigint[]): bigint {
  return countBatch(right) + countBatch(left);
}
