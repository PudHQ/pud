import type { Model, RuntimeValue } from "./translate.ts";

const integers = [0n, 1n, -1n, 2n, -2n];
const booleans = [false, true];

export function findCounterexample(model: Model): { args: RuntimeValue[]; result: RuntimeValue } | undefined {
  if (!model.replay) return;
  const domains = model.params.map(p => p.sort === "Z" ? integers : booleans);
  const indices = domains.map(() => 0);

  // A finite search can refute a universal claim. Only the prover can certify it.
  for (let sample = 0; sample < 256; sample++) {
    const args = domains.map((values, i) => values[indices[i]!]!);
    const result = model.replay.run(...args);
    if (!model.replay.holds(...args, result)) return { args, result };

    let position = indices.length - 1;
    while (position >= 0) {
      const next = indices[position]! + 1;
      if (next < domains[position]!.length) {
        indices[position] = next;
        break;
      }
      indices[position] = 0;
      position--;
    }
    if (position < 0) break;
  }
}

export function formatValue(value: RuntimeValue): string {
  return typeof value === "bigint" ? `${value}n` : String(value);
}
