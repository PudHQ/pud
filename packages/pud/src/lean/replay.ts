import { traverseFast } from "@babel/types";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Counterexample, ProofCall, ProofClaim } from "../assistant.ts";
import { runProver } from "../prover-process.ts";
import type { lowerProgram } from "./program.ts";
import { replayConstraints } from "./replay-predicate.ts";
import type { Sort } from "./syntax.ts";

type Program = ReturnType<typeof lowerProgram>;
type ReplayValue = bigint | number | boolean | readonly bigint[];
const samples: Partial<Record<Sort, readonly ReplayValue[]>> = {
  integer: [0n, 1n, -1n, 2n, 9_007_199_254_740_993n],
  number: [0, -0, ...[1, 0.5, 0.25, 0.125, 1 / 16, 1 / 1024, Number.EPSILON, Number.MIN_VALUE,
    2 ** -1022, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE, Infinity].flatMap(x => [x, -x]), NaN],
  boolean: [false, true],
  integers: [[], [1n], [0n], [2n], [-1n, 2n], [1n, 1n], [9_007_199_254_740_993n]],
};

function inputsFor(program: Program) {
  // Branch literals often reach a path the generic boundary values miss.
  const numbers = new Set<number>(), integers = new Set<bigint>();
  for (const module of program.modules.values()) traverseFast(module.program, node => {
    if (node.type === "NumericLiteral" && numbers.size < 32) {
      numbers.add(node.value).add(-node.value);
    } else if (node.type === "BigIntLiteral" && integers.size < 32) {
      const value = BigInt(node.value);
      integers.add(value).add(-value);
    }
  });
  let inputs: ReplayValue[][] = [[]];
  for (const { sort } of program.root.params) {
    const base = samples[sort];
    if (!base) return [];
    const literals = sort === "number" ? numbers : sort === "integer" ? integers : [];
    const domain = [...base, ...[...literals].filter(value => !base.includes(value))];
    inputs = inputs.flatMap(input => domain.map(value => [...input, value])).slice(0, 128);
  }
  return inputs;
}

function literal(value: ReplayValue): string {
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "boolean") return String(value);
  return `[${value.map(literal).join(", ")}]`;
}

/** Execute the observation against the same frozen files and resolved imports used by the proof. */
export async function replayClaim(program: Program, claim: ProofClaim, directory: string): Promise<Counterexample | undefined> {
  if (claim.kind === "throw") return;
  const { params, name } = program.root;
  const observed: ProofCall = claim.observation ?? { kind: "call", callee: "subject",
    args: params.map(parameter => ({ kind: "parameter", name: parameter.name })),
  };
  const parameters = new Map(params.map((parameter, index) => [parameter.name, `args[${index}]`]));
  const modules = new Map<string, string>();
  function call(node: ProofCall): string {
    const subject = node.callee === "subject" ? program.root : program.resolve(node.callee.file, node.callee.name);
    modules.set(subject.file, modules.get(subject.file) ?? `module${modules.size}`);
    const args = node.args.map(arg => arg.kind === "parameter" ? parameters.get(arg.name)! : call(arg));
    return `${modules.get(subject.file)}[${JSON.stringify(subject.name)}](${args.join(", ")})`;
  }
  const premises = replayConstraints(claim.premises, parameters);
  const assertions = replayConstraints(claim.assertions, parameters);
  if (!premises || !assertions) return;
  const actual = call(observed);
  const reference = claim.kind === "equal" ? call(claim.reference) : undefined;
  const inputs = inputsFor(program);
  if (!inputs.length) return;
  const resultSort = (observed.callee === "subject" ? program.root : program.resolve(observed.callee.file, observed.callee.name)).result;
  const candidates = samples[resultSort]?.map(literal).join(", ") ?? "";
  const ambiguityCheck = claim.exactResult ? `
    const neighbors = typeof received === "bigint" ? [received + 1n, received - 1n] :
      typeof received === "number" ? [received + 1, received - 1, -received] : [!received];
    const alternative = [...neighbors, ${candidates}].find(value => !Object.is(received, value) && accepts(value));
    if (alternative !== undefined) {
      process.stdout.write(JSON.stringify({ index, received: display(received), alternative: display(alternative) }));
      break;
    }` : "";
  const files = new Map([...program.modules.keys()].map((file, index) => [file, `subject-${index}.ts`]));
  mkdirSync(directory);
  for (const [file, snapshot] of program.modules) {
    const rewritten = [...snapshot.resolvedImports].reverse().reduce((contents, entry) =>
      contents.slice(0, entry.start) + JSON.stringify(`./${files.get(entry.file)}`) + contents.slice(entry.end), snapshot.source);
    writeFileSync(join(directory, files.get(file)!), rewritten);
  }

  const imports = [...modules].map(([file, alias]) => `import * as ${alias} from "./${files.get(file)}";`);
  writeFileSync(join(directory, "replay.ts"), `${imports.join("\n")}
const inputs = [${inputs.map(values => `[${values.map(literal).join(", ")}]`).join(",\n  ")}];
const display = value => typeof value === "bigint" ? String(value) + "n" : Object.is(value, -0) ? "-0" : String(value);
function nearestInteger(x, tiesUp) {
  const lower = Math.floor(x), upper = Math.ceil(x);
  if (lower === upper) return lower;
  const midpoint = lower + 0.5;
  return (tiesUp ? x < midpoint : x <= midpoint) ? lower : upper;
}
for (const [index, args] of inputs.entries()) {
  if (!(${premises})) continue;
  let received;
  try { received = ${actual}; } catch { continue; }
  ${reference ? `let expected;
  try { expected = ${reference}; } catch { continue; }
  if (received === expected) continue;
  process.stdout.write(JSON.stringify({ index, expected: display(expected), received: display(received) }));` :
  `const accepts = received => ${assertions};
  if (accepts(received)) {${ambiguityCheck}
    continue;
  }
  process.stdout.write(JSON.stringify({ index, received: display(received) }));`}
  break;
}
`);
  const run = await runProver(process.execPath, ["--no-env-file", "run", "replay.ts"], {
    cwd: directory, timeout: 3_000, maxBuffer: 64 * 1024,
  });
  if (run.status !== 0) throw new Error(run.stderr.trim() || `Bun exited with status ${run.status}.`);
  if (!run.stdout) return;
  const { index, expected, received, alternative } = JSON.parse(run.stdout) as {
    index: number; expected?: string; received: string; alternative?: string;
  };
  const witness = inputs[index];
  if (!witness || (reference && typeof expected !== "string") || typeof received !== "string") throw new Error("Bun returned an invalid witness.");
  return {
    summary: alternative !== undefined ? `The result rule permits both ${received} and ${alternative} for the same input.`
      : expected === undefined ? `${name} returned ${received}, violating the result assertion in Bun.`
      : received === "NaN" && expected === "NaN"
      ? "Both calls returned NaN, which fails JavaScript strict equality."
      : `${name} returned a different value from the reference in Bun.`,
    input: Object.fromEntries(params.map((parameter, i) => [parameter.name, literal(witness[i]!)])),
    result: received,
    ...(alternative !== undefined && { alternative }),
    ...(expected !== undefined && { difference: { subject: name, expected, received } }),
  };
}
