import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { check, checkFiles, emit, type CheckProgress, type ProofAssistant } from "../src/index.ts";
import { leanCommand } from "../src/lean/command.ts";
import { leanAdapter } from "../src/lean/index.ts";

const examples = join(import.meta.dir, "../experiments/lean/.examples");
const toolchain = readFileSync(join(examples, "../lean-toolchain"), "utf8").trim();
const adapter = leanAdapter({ toolchain });
const command = leanCommand({ file: join(examples, "zigzag.ts"), name: "encode", source: "" }, { toolchain });
const leanTest = test.skipIf(!Bun.which(command.binary));

async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "pud-lean-test-"));
  try { await run(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

function sidecar(subject: string, functionImports: string, source: string, schemas: string, inputs: string, assertion: string) {
  return `import { describe, expect, it, pud } from "@pud/cli";
import { ${functionImports} } from "${source}";
describe(${subject}, () => {
  it("observes the linked implementation", { ${schemas} }, ({ ${inputs} }) => {
    ${assertion}
  });
});`;
}

type Input = readonly (bigint | boolean)[];

function runtimeOutcome(run: () => bigint): string {
  try { return `ok:${run()}`; }
  catch (error) {
    if (!(error instanceof Error)) throw error;
    return `throw:${error.name}`;
  }
}

async function evaluate(directory: string, file: string, inputs: readonly Input[], fallible: boolean, property?: string) {
  const unit = await emit(file, { adapter, property });
  const stop = unit.indexOf("\ntheorem checked : claim :=");
  if (stop === -1) throw new Error("Expected an emitted proof unit.");
  const applications = (functionName: string) => inputs.map(values => [functionName, ...values.map(value =>
    typeof value === "bigint" ? `(${value} : Int)` : String(value))].join(" ")).join(",\n  ");
  const observeOutcome = `fun outcome => match outcome with
      | .ok value => "ok:" ++ toString value
      | .error .error => "throw:Error"
      | .error .rangeError => "throw:RangeError"
      | .error .typeError => "throw:TypeError"`;
  const observe = fallible ? observeOutcome : 'fun value => "ok:" ++ toString value';
  const source = unit.includes("\ndef implSource ")
    ? `\n#eval String.intercalate "," ([${applications("Pud.implSource")}].map (fun e => (${observeOutcome}) (Pud.Scalar.evaluate e)))\n`
    : "";
  const modelFile = join(directory, "Model.lean");
  await writeFile(modelFile, unit.slice(0, stop) + `\nend Pud

#eval String.intercalate "," ([${applications("Pud.impl")}].map (${observe}))
${source}`);
  const run = Bun.spawnSync([command.binary, modelFile], {
    cwd: directory, env: command.env, stdout: "pipe", stderr: "pipe", timeout: 20_000,
  });
  if (!run.success) throw new Error(run.stdout.toString() + run.stderr.toString());
  const [implementation, reference] = run.stdout.toString().split("\n").filter(line => line.startsWith('"'))
    .map(line => (JSON.parse(line) as string).split(","));
  if (!implementation) throw new Error("Lean did not print the implementation observations.");
  if (source) expect(reference).toEqual(implementation);
  return implementation;
}

leanTest("the Lean model agrees with Bun on signed bigint calls, short circuits, exception order and catch", async () => {
  await fixture(async directory => {
    await writeFile(join(directory, "arithmetic.ts"), `
export function divide(n: bigint, d: bigint): bigint { return n / d; }
export function rejectZero(d: bigint): bigint {
  if (d === 0n) throw new TypeError("zero");
  return d;
}`);
    const source = join(directory, "outcome.ts");
    await writeFile(source, `import { divide as quotient, rejectZero } from "./arithmetic";

export function outcome(n: bigint, d: bigint, active: boolean, reverse: boolean): bigint {
  if (active && n % -3n !== 0n) {
    return reverse ? rejectZero(d) + quotient(n, d) : quotient(n, d) + rejectZero(d);
  }
  return !active || n % d === 0n ? 42n : quotient(n, d);
}
export function recover(n: bigint, d: bigint, active: boolean, reverse: boolean): bigint {
  try { return outcome(n, d, active, reverse); }
  catch { return -99n; }
}`);
    const inputs = [-5n, -3n, 0n, 3n, 5n, (1n << 70n) + 5n].flatMap(n =>
      [-3n, -1n, 0n, 1n, 3n].flatMap(d => [false, true].flatMap(active =>
        [false, true].map(reverse => [n, d, active, reverse] as const))));
    const module = await import(pathToFileURL(source).href);
    for (const subject of ["outcome", "recover"]) {
      const file = join(directory, subject + ".proof.ts");
      await writeFile(file, sidecar(subject, subject, "./outcome.ts",
        "n: pud.bigint(), d: pud.bigint(), active: pud.boolean(), reverse: pud.boolean()", "n, d, active, reverse",
        `expect(${subject}(n, d, active, reverse)).to(pud.bigint().refine(_value => true));`));
      const expected = inputs.map(args => runtimeOutcome(() => module[subject](...args)));
      if (subject === "outcome") {
        expect(expected).toContain("throw:RangeError");
        expect(expected).toContain("throw:TypeError");
      }
      expect(await evaluate(directory, file, inputs, subject === "outcome")).toEqual(expected);
    }
  });
}, 30_000);

leanTest("both ZigZag callees are part of the theorem and edits to either invalidate its proof", async () => {
  await fixture(async directory => {
    const source = join(directory, "zigzag.ts"), file = join(directory, "zigzag.proof.ts");
    const original = await readFile(join(examples, "zigzag.ts"), "utf8");
    await writeFile(file, await readFile(join(examples, "zigzag-roundtrip.proof.ts"), "utf8"));
    await writeFile(source, original);
    expect((await check(file, { adapter })).results[0]?.status).toBe("proved");
    for (const [before, after] of [["-2n * value - 1n", "-2n * value + 1n"], ["code / 2n", "code / 2n + 1n"]]) {
      await writeFile(source, original.replace(before!, after!));
      expect((await check(file, { adapter })).results[0]?.status).toBe("unproved");
    }
  });
}, 20_000);

leanTest("the same fold theorem checks guarded updates through a linked implementation", async () => {
  await fixture(async directory => {
    const file = join(directory, "sum-positive.proof.ts");
    const subject = join(directory, "sum-positive.ts");
    const helper = join(directory, "accumulate.ts");
    const proof = await readFile(join(examples, "sum-positive.proof.ts"), "utf8");
    await writeFile(file, proof.replace("../pud.config.ts", "./pud.config.ts"));
    await writeFile(join(directory, "pud.config.ts"), "export default {};");
    await writeFile(join(directory, "sum-positive-lemmas.lean"), await readFile(join(examples, "sum-positive-lemmas.lean"), "utf8"));
    function source(name: string, update: string) {
      return `export function ${name}(values: readonly bigint[]): bigint {
  const threshold = 0n;
  let total = 0n;
  for (const value of values) { ${update} }
  return total;
}`;
    }
    const guard = "if (value > threshold) { total = total + value; }";
    const verdict = async () => (await check(file, { adapter })).results[0]?.status;
    await writeFile(subject, source("sumPositive", "total += value > threshold ? value : 0n;"));
    expect(await verdict()).toBe("proved");
    await writeFile(subject, source("sumPositive", guard));
    expect(await verdict()).toBe("proved");
    const unit = await emit(file, { adapter });
    expect(unit).toContain("theorem implLoop0Conforms");
    expect(unit).toContain("using (PositiveSum.nonnegative)");

    await writeFile(subject, `import { accumulate } from "./accumulate.ts";
export function sumPositive(values: readonly bigint[]): bigint { return accumulate(values); }`);
    await writeFile(helper, source("accumulate", `${guard} else { total += 0n; }`));
    expect(await verdict()).toBe("proved");
    await writeFile(helper, source("accumulate", guard.replace(">", "<")));
    expect(await verdict()).toBe("unproved");
  });
}, 20_000);

test("transitive imports are snapshotted and a change to their resolution invalidates a verdict", async () => {
  await fixture(async directory => {
    const file = join(directory, "subject.proof.ts"), dependency = join(directory, "dependency.ts");
    const helper = "export function step(n: bigint): bigint { return n + 1n; }";
    await writeFile(dependency, helper);
    await writeFile(join(directory, "intermediate.ts"), 'import { step } from "./dependency";\nexport function next(n: bigint): bigint { return step(n); }');
    await writeFile(join(directory, "subject.ts"), 'import { next } from "./intermediate.ts";\nexport function subject(n: bigint): bigint { return next(n); }');
    await writeFile(file, sidecar("subject", "subject", "./subject.ts", "n: pud.bigint()", "n",
      "expect(subject(n)).to(pud.bigint().eq(n + 1n));"));
    for (const [path, contents, message] of [
      [dependency, helper.replace("+ 1n", "- 1n"), "dependency.ts changed during verification"],
      [join(directory, "dependency"), helper, "The import of"],
    ] as const) {
      await writeFile(dependency, helper);
      const editDuringVerification: ProofAssistant<"lean"> = {
        ...adapter,
        async prepare(source) {
          const program = await adapter.prepare(source);
          return { ...program, async verify(claims, modules) {
            await program.emit(claims[0]!, modules);
            await writeFile(path, contents);
            return [{ status: "proved" }];
          } };
        },
      };
      const result = (await check(file, { adapter: editDuringVerification })).results[0];
      expect(result?.status).toBe("error");
      expect(result?.detail).toContain(message);
    }
  });
});

leanTest("a zero divisor cannot prove a success property or the wrong exception", async () => {
  await fixture(async directory => {
    const source = "bigint-division.ts";
    await writeFile(join(directory, source), await readFile(join(examples, source), "utf8"));
    const file = join(directory, "division.proof.ts");
    const inputs = "numerator, divisor";
    const schemas = "numerator: pud.bigint(), divisor: pud.bigint().eq(0n)";
    for (const assertion of [
      `expect(divide(${inputs})).to(pud.bigint().refine(_value => true));`,
      `expect(() => divide(${inputs})).toThrow("TypeError");`,
    ]) {
      await writeFile(file, sidecar("divide", "divide", "./" + source, schemas, inputs, assertion));
      const events: CheckProgress[] = [];
      const result = await check(file, { adapter, onProgress: event => events.push(event) });
      expect(result.results[0]?.status).toBe("unproved");
      expect(events.find(event => event.kind === "finished")).toMatchObject({ indices: [0], statuses: ["unproved"] });
    }
  });
}, 20_000);

leanTest("progress visits each Lean item before the shared snapshot check", async () => {
  const events: CheckProgress[] = [];
  const files = ["bigint-division.proof.ts", "zigzag-roundtrip.proof.ts"].map(file => join(examples, file));
  const reports = await checkFiles(files, { adapter, onProgress: event => events.push(event) });
  expect(reports.flatMap(report => report.results).map(result => result.status)).toEqual(["proved", "proved", "proved"]);
  expect(events.filter(event => event.kind === "suite").map(event => [event.index, event.totalItems])).toEqual([[0, 3], [1, 3]]);
  const completedFirst = events.findIndex(event => event.kind === "finished" && event.file === files[0] &&
    event.indices.length === 1 && event.indices[0] === 0);
  const startedSecond = events.findIndex(event => event.kind === "running" && event.file === files[0] &&
    event.indices.length === 1 && event.indices[0] === 1);
  expect(completedFirst).toBeGreaterThan(0);
  expect(events[completedFirst]).toMatchObject({ statuses: ["proved"] });
  expect(startedSecond).toBeGreaterThan(completedFirst);
  expect(events.at(-1)).toEqual({ kind: "validating" });
}, 30_000);

leanTest("the lowering certificate catches a mistranslation outside the user property's domain", async () => {
  await fixture(async directory => {
    const unit = await emit(join(examples, "bigint-division.proof.ts"), {
      adapter, property: "returns a quotient truncated toward zero for every nonzero divisor",
    });
    expect(unit).toContain("theorem sourceChecked : sourceClaim");
    const implementation = unit.indexOf("\ndef impl ");
    const mutated = unit.slice(0, implementation) + unit.slice(implementation)
      .replace("Except.error .rangeError", "Except.error .typeError");
    expect(mutated).not.toBe(unit);
    async function run(source: string) {
      const path = join(directory, "Certificate.lean");
      await writeFile(path, source);
      return Bun.spawnSync([command.binary, path], { cwd: directory, env: command.env, timeout: 20_000 });
    }
    const correct = await run(unit);
    expect(correct.stdout.toString()).not.toContain("error:");
    expect(correct.exitCode).toBe(0);
    expect((await run(mutated)).exitCode).toBe(1);
    const propertyOnly = mutated.slice(0, mutated.indexOf("\ntheorem implLowering")) +
      mutated.slice(mutated.indexOf("\ndef claim : Prop :="), mutated.indexOf("\ndef sourceClaim : Prop :=")) +
      mutated.slice(mutated.indexOf("\ntheorem checked : claim :="), mutated.indexOf("\ntheorem sourceChecked : sourceClaim")) + "\nend Pud\n";
    expect((await run(propertyOnly)).exitCode).toBe(0);
  });
}, 30_000);

leanTest("the checked loop and recursion agree with Bun and reject missing decreases", async () => {
  await fixture(async directory => {
    const source = join(directory, "termination.ts");
    const original = await readFile(join(examples, "termination.ts"), "utf8");
    await writeFile(source, original);
    const mod = await import(pathToFileURL(source).href);
    const inputs = [-5n, -1n, 0n, 1n, 2n, 5n, 8n, 15n].map(value => [value] as const);
    const cases = [
      ["countdown-sum", "countdownSum", "remaining -= 1n", "remaining += 1n", "unsupported"],
      ["recursive-sum", "recursiveSum", "recursiveSum(value - 1n)", "recursiveSum(value + 1n)", "unproved"],
    ] as const;
    for (const [name, subject, before, after, rejection] of cases) {
      await writeFile(source, original);
      const file = join(directory, name + ".proof.ts");
      const proof = await readFile(join(examples, name + ".proof.ts"), "utf8");
      await writeFile(file, proof);
      const positive = "sums the five positive values from five down to one";
      expect((await check(file, { adapter })).results.map(result => result.status)).toEqual(["proved", "proved"]);
      expect(await evaluate(directory, file, inputs, false, positive)).toEqual(inputs.map(args => runtimeOutcome(() => mod[subject](...args))));
      await writeFile(source, original.replace(before, after));
      expect((await check(file, { adapter })).results.every(result => result.status === rejection)).toBe(true);
    }
    const loopSource = join(directory, "loop.ts"), loopSuite = join(directory, "loop.proof.ts");
    await writeFile(loopSource, `export function loop(value: bigint, divisor: bigint): bigint {
  let counter = value;
  let total = 0n;
  let add = true;
  while (counter >= -2n) {
    if (add) total += counter / divisor;
    add = !add;
    counter -= 2n;
  }
  return total + counter;
}`);
    await writeFile(loopSuite, sidecar("loop", "loop", "./loop.ts", "value: pud.bigint(), divisor: pud.bigint()", "value, divisor",
      "expect(loop(value, divisor)).to(pud.bigint().refine(_value => true));"));
    const loop = (await import(pathToFileURL(loopSource).href)).loop;
    const loopInputs = inputs.flatMap(([value]) => [-2n, 0n, 2n].map(divisor => [value, divisor] as const));
    expect(await evaluate(directory, loopSuite, loopInputs, true)).toEqual(loopInputs.map(args => runtimeOutcome(() => loop(...args))));
  });
}, 30_000);

test("the linker rejects runtime initialization and a local binding that shadows a linked function", async () => {
  await fixture(async directory => {
    const file = join(directory, "subject.proof.ts"), source = join(directory, "subject.ts");
    await writeFile(file, sidecar("subject", "subject", "./subject.ts", "n: pud.bigint()", "n",
      "expect(subject(n)).to(pud.bigint().eq(n));"));
    await writeFile(join(directory, "helper.ts"), 'console.log("runtime initializer");\nexport function step(n: bigint): bigint { return n; }');
    await writeFile(source, 'import { step } from "./helper.ts";\nexport function subject(n: bigint): bigint { return n; }');
    expect((await check(file, { adapter })).results[0]?.status).toBe("unsupported");
    await writeFile(source, "function step(n: bigint): bigint { return n; }\nexport function subject(n: bigint): bigint { const result = step(n); const step = false; return result; }");
    expect((await check(file, { adapter })).results[0]).toMatchObject({ status: "unsupported", detail: expect.stringContaining("shadowing") });
  });
});
