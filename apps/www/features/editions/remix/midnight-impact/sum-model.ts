import { countdownSum } from "../../../../../../packages/pud/.examples/termination";
import { fixtureRoot } from "../bench-ui";

export const sumSources = {
  implementation: fixtureRoot + "termination.ts",
  sidecar: fixtureRoot + "countdown-sum.proof.ts",
  lean: fixtureRoot + "triangular-sum.lean",
};

// The registered loop with a single edited digit in its guard.
function skipOne(value: bigint): bigint {
  let remaining = value;
  let total = 0n;
  while (remaining > 1n) {
    total += remaining;
    remaining -= 1n;
  }
  return total;
}

/** Counts for the finite, draggable board. Both implementations run as TypeScript bigints. */
export function inspectSum(rows: number, skipsOne: boolean) {
  if (rows < 0 || !Number.isInteger(rows) || !Number.isSafeInteger(rows * (rows + 1))) {
    throw new RangeError("The board needs a nonnegative row count and an exactly countable area.");
  }
  const n = BigInt(rows);
  const actual = skipsOne ? skipOne(n) : countdownSum(n);
  const doubled = 2n * actual;
  const area = n * (n + 1n);
  return {
    rows,
    actual: Number(actual),
    expected: Number(area / 2n),
    doubled: Number(doubled),
    area: Number(area),
    missing: Number(area - doubled),
  };
}

// Both guards return zero at 0n. The next nonnegative bigint exposes the edit.
export const smallestCounterexample = inspectSum(1, true);
