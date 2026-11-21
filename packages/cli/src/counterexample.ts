import type { Model, RuntimeValue } from "./translate.ts";
import type { Counterexample } from "@pud/model/adapter";

const integers = [0n, 1n, -1n, 2n, -2n];
const booleans = [false, true];

export function* sampleInputs(params: Model["params"]): Generator<RuntimeValue[]> {
  const domains = params.map(p => p.sort === "integer" ? integers : booleans);
  const indices = domains.map(() => 0);

  // A finite search can refute a universal claim. Only the prover can certify it.
  for (let sample = 0; sample < 256; sample++) {
    const args = domains.map((values, i) => values[indices[i]!]!);
    yield args;

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

export function findCounterexample(model: Model): { args: RuntimeValue[]; result: RuntimeValue } | undefined {
  if (!model.replay) return;
  for (const args of sampleInputs(model.params)) {
    const result = model.replay.run(...args);
    if (!model.replay.holds(...args, result)) return { args, result };
  }
}

export function formatValue(value: RuntimeValue): string {
  return typeof value === "bigint" ? `${value}n` : String(value);
}

export function observedReturn(name: string, params: Model["params"], args: RuntimeValue[], result: RuntimeValue): Counterexample {
  return {
    summary: `${name}(${args.map(formatValue).join(", ")}) returned ${formatValue(result)}. The property evaluated to false.`,
    input: Object.fromEntries(params.map((p, i) => [p.label, formatValue(args[i]!)])),
    result: formatValue(result),
  };
}
