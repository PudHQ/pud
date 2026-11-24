import { divide } from "./bigint-division.ts";

export function divideOrZero(numerator: bigint, divisor: bigint): bigint {
  try {
    return divide(numerator, divisor);
  } catch {
    return 0n;
  }
}
