import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Counterexample, ProofCall, ProofClaim } from "../assistant.ts";
import { runProver } from "../prover-process.ts";
import type { lowerProgram } from "./program.ts";
import type { Parameter } from "./subject.ts";
import type { Sort } from "./syntax.ts";

type Program = ReturnType<typeof lowerProgram>;
type ReplayValue = bigint | boolean | readonly bigint[];
const samples: Partial<Record<Sort, readonly ReplayValue[]>> = {
  integer: [0n, 1n, -1n, 2n, 9_007_199_254_740_993n],
  boolean: [false, true],
  integers: [[], [1n], [0n], [2n], [-1n, 2n], [1n, 1n], [9_007_199_254_740_993n]],
};

function inputsFor(parameters: readonly Parameter[]) {
  let inputs: ReplayValue[][] = [[]];
  for (const parameter of parameters) {
    const domain = samples[parameter.sort];
    if (!domain) return [];
    inputs = inputs.flatMap(input => domain.map(value => [...input, value])).slice(0, 128);
  }
  return inputs;
}

function literal(value: ReplayValue): string {
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "boolean") return String(value);
  return `[${value.map(literal).join(", ")}]`;
}

/** Execute both calls against the same frozen files and resolved imports used by the proof. */
export async function replayEquality(program: Program, claim: ProofClaim, directory: string): Promise<Counterexample | undefined> {
  if (!claim.reference || claim.premises.length) return;
  const { params, name } = program.root;
  const inputs = inputsFor(params);
  if (!inputs.length) return;
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
  const actual = call(observed);
  const reference = call(claim.reference);
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
const display = value => typeof value === "bigint" ? String(value) + "n" : String(value);
for (const [index, args] of inputs.entries()) {
  const received = ${actual};
  const expected = ${reference};
  if (received === expected) continue;
  process.stdout.write(JSON.stringify({ index, expected: display(expected), received: display(received) }));
  break;
}
`);
  const run = await runProver(process.execPath, ["--no-env-file", "run", "replay.ts"], {
    cwd: directory, timeout: 3_000, maxBuffer: 64 * 1024,
  });
  if (run.status !== 0) throw new Error(run.stderr.trim() || `Bun exited with status ${run.status}.`);
  if (!run.stdout) return;
  const { index, expected, received } = JSON.parse(run.stdout) as { index: number; expected: string; received: string };
  const witness = inputs[index];
  if (!witness || typeof expected !== "string" || typeof received !== "string") throw new Error("Bun returned an invalid witness.");
  return {
    summary: `${name} returned a different value from the reference in Bun.`,
    input: Object.fromEntries(params.map((parameter, i) => [parameter.name, literal(witness[i]!)])),
    result: received,
    difference: { subject: name, expected, received },
  };
}
