import { afterEach, expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { check } from "../src/index.ts";
import { leanCommand } from "../src/lean/command.ts";
import { leanAdapter } from "../src/lean/index.ts";
import { numberSemantics } from "../src/lean/number.ts";
import { millisecondsToSeconds, secondsToMilliseconds } from "../.examples/motion/time-conversion.ts";
import { toCents } from "../.examples/cents.ts";
import { lowerProgram } from "../src/lean/program.ts";

const examples = join(import.meta.dir, "../.examples");
const toolchain = (await readFile(join(examples, "lean-toolchain"), "utf8")).trim();
const command = leanCommand({ file: join(examples, "cents.ts"), name: "toCents", source: "" }, { toolchain });
const leanTest = test.skipIf(!Bun.which(command.binary));
const adapter = leanAdapter({ toolchain, replay: true });
const directories: string[] = [];
async function fixture() {
  const path = await mkdtemp(join(tmpdir(), "pud-number-"));
  directories.push(path);
  return path;
}
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});

test("native rounding regressions retain their exact binary64 results", () => {
  expect(secondsToMilliseconds(0.0015)).toBe(1.5);
  expect(secondsToMilliseconds(1.005)).toBe(1004.9999999999999);
  expect(secondsToMilliseconds(millisecondsToSeconds(1001))).toBe(1000.9999999999999);
  expect(Object.is(millisecondsToSeconds(-Number.MIN_VALUE), -0)).toBe(true);
  expect([1.005, -1.125, 0.29].map(toCents)).toEqual([100, -112, 29]);
});

leanTest("Motion's quantified laws detect premature rounding and a lost direction, with native witnesses", async () => {
  const dir = await fixture();
  await cp(join(examples, "motion"), dir, { recursive: true });
  const seconds = join(dir, "seconds.proof.ts"), millis = join(dir, "milliseconds.proof.ts");
  const source = join(dir, "time-conversion.ts"), original = await readFile(source, "utf8");
  expect(new Bun.CryptoHasher("sha256").update(original).digest("hex"))
    .toBe("13e16d991b9c609279d87c52295daf0fe797f85c517f5a59c11e0d7e9947d3c7");
  const results = async (file: string) => (await check(file, { adapter })).results;
  expect((await results(seconds)).map(r => r.status)).toEqual(["proved", "proved", "proved"]);
  expect((await results(millis)).map(r => r.status)).toEqual(["proved", "proved", "proved"]);

  await writeFile(source, original.replace("seconds * 1000", "Math.round(seconds * 1000)"));
  const [sign, scale, reverse] = await results(seconds);
  expect(sign?.status).toBe("proved");
  expect(scale?.status).toBe("disproved");
  const duration = Number(scale!.counterexample!.input.seconds);
  expect(Math.round(duration * 1000)).not.toBe(duration * 1000);
  expect(reverse?.status).toBe("disproved");
  const reversed = Number(reverse!.counterexample!.input.seconds);
  expect(Math.round(-reversed * 1000) === -Math.round(reversed * 1000)).toBe(false);

  await writeFile(source, original.replace("milliseconds / 1000", "milliseconds / -1000"));
  const [, direction] = await results(millis);
  expect(direction?.status).toBe("disproved");
  const negative = Number(direction!.counterexample!.input.milliseconds);
  expect(negative).toBeLessThan(0);
  expect(negative / -1000 < 0 || 1 / (negative / -1000) < 0).toBe(false);

  await writeFile(source, original.replace("milliseconds / 1000", "milliseconds / 100"));
  const [wrongUnits, signKept, reversalKept] = await results(millis);
  expect([wrongUnits?.status, signKept?.status, reversalKept?.status]).toEqual(["disproved", "proved", "proved"]);
  const value = Number(wrongUnits!.counterexample!.input.milliseconds);
  expect(value / 100).not.toBe(value / 1000);
}, 70_000);

leanTest("the exact cents law rejects wrong fractional results, tie policies and signs of zero", async () => {
  const dir = await fixture(), proof = join(dir, "cents.proof.ts"), source = join(dir, "cents.ts");
  await cp(join(examples, "cents.proof.ts"), proof);
  const original = await readFile(join(examples, "cents.ts"), "utf8");
  const result = async () => (await check(proof, { adapter })).results[0]!;
  await writeFile(source, original);
  expect(await result()).toMatchObject({ status: "proved", exactResult: true });

  const law = await readFile(proof, "utf8");
  await writeFile(proof, law.replace('.nearestIntegerTo(amount * 100, { ties: "up" })', ".refine(cents => Number.isInteger(cents))"));
  expect(await result()).toMatchObject({
    status: "disproved", counterexample: { input: { amount: "0" }, result: "0", alternative: "1" },
  });
  await writeFile(proof, law);

  // Each mutant agrees with both former laws (whole scaled cents and the zero interval).
  for (const [amount, wrong] of [[0.29, 28.9], [0.125, 12], [-0.125, -13]] as const) {
    const body = `amount === ${amount} ? ${wrong} : Math.round(amount * 100)`;
    await writeFile(source, original.replace("Math.round(amount * 100)", body));
    expect(await result()).toMatchObject({
      status: "disproved", counterexample: { input: { amount: String(amount) }, result: String(wrong) },
    });
  }
  await writeFile(source, original.replace("Math.round(amount * 100)", "Math.round(amount * 100) + 0"));
  expect(await result()).toMatchObject({ status: "disproved", counterexample: { input: { amount: "-0" }, result: "0" } });
}, 45_000);

leanTest("an exact scalar schema proves uniqueness and reports a second accepted answer", async () => {
  const dir = await fixture(), proof = join(dir, "id.proof.ts");
  await writeFile(join(dir, "id.ts"), "export const id = (x: bigint) => x; export const zero = (x: bigint) => x === 0n;");
  await writeFile(proof, `import { describe, expect, it, pud } from "pud.dev";
import { id, zero } from "./id.ts";
describe(id, () => {
  it("keeps the lower bound", { x: pud.bigint() }, ({ x }) => {
    expect(id(x)).to(pud.bigint().gte(x));
  });
  it("determines the answer from the lower bound", { x: pud.bigint() }, ({ x }) => {
    expect(id(x)).toExactly(pud.bigint().gte(x));
  });
  it("pins the result between matching bounds", { x: pud.bigint() }, ({ x }) => {
    expect(id(x)).toExactly(pud.bigint().gte(x).lte(x));
  });
  it("identifies zero", { x: pud.bigint() }, ({ x }) => {
    expect(zero(id(x))).toExactly(pud.boolean().eq(x === 0n));
  });
  it("leaves either boolean possible", { x: pud.bigint() }, ({ x }) => {
    expect(zero(id(x))).toExactly(pud.boolean());
  });
});`);
  const [invariant, ambiguous, unique, boolean, either] = (await check(proof, { adapter })).results;
  expect(invariant?.status).toBe("proved");
  expect(ambiguous).toMatchObject({ status: "disproved", exactResult: true,
    counterexample: { input: { x: "0n" }, result: "0n", alternative: "1n" } });
  expect(unique).toMatchObject({ status: "proved", exactResult: true });
  expect(boolean).toMatchObject({ status: "proved", exactResult: true });
  expect(either).toMatchObject({ status: "disproved", counterexample: { result: "true", alternative: "false" } });
}, 15_000);

leanTest("exact number rules distinguish signed zeros and make the half-tie policy explicit", async () => {
  const dir = await fixture(), proof = join(dir, "round.proof.ts");
  await writeFile(join(dir, "round.ts"), "export const rounded = (x: number) => -Math.round(-x);");
  await writeFile(proof, `import { describe, expect, it, pud } from "pud.dev";
import { rounded } from "./round.ts";
describe(rounded, () => {
  it("takes the lower integer at a tie", { x: pud.number() }, ({ x }) => {
    expect(rounded(x)).toExactly(pud.number().nearestIntegerTo(x, { ties: "down" }));
  });
  it("takes the upper integer at a tie", { x: pud.number() }, ({ x }) => {
    expect(rounded(x)).toExactly(pud.number().nearestIntegerTo(x, { ties: "up" }));
  });
  it("leaves the sign unspecified", { x: pud.number().gte(0).lt(0.5) }, ({ x }) => {
    expect(rounded(x)).toExactly(pud.number().eq(0));
  });
});`);
  const [down, up, zeros] = (await check(proof, { adapter })).results;
  expect(down?.status).toBe("proved");
  expect(up).toMatchObject({ status: "disproved", counterexample: { input: { x: "0.5" }, result: "0" } });
  expect(zeros).toMatchObject({ status: "disproved", counterexample: { input: { x: "0" }, result: "0", alternative: "-0" } });
}, 15_000);

leanTest("an exact result requires the function to return on its declared domain", async () => {
  const dir = await fixture(), proof = join(dir, "partial.proof.ts");
  await writeFile(join(dir, "partial.ts"), `export function partial(x: bigint): bigint {
    if (x < 0n) throw new RangeError();
    return x;
  }`);
  await writeFile(proof, `import { describe, expect, it, pud } from "pud.dev";
import { partial } from "./partial.ts";
describe(partial, () => {
  it("returns the nonnegative input", { x: pud.bigint().gte(0n) }, ({ x }) => {
    expect(partial(x)).toExactly(pud.bigint().eq(x));
  });
  it("always returns the input", { x: pud.bigint() }, ({ x }) => {
    expect(partial(x)).toExactly(pud.bigint().eq(x));
  });
});`);
  const [guarded, unguarded] = (await check(proof, { adapter: leanAdapter({ toolchain }) })).results;
  expect(guarded).toMatchObject({ status: "proved" });
  expect(unguarded).toMatchObject({ status: "unproved", exactResult: true, diagnostic: expect.any(String) });
}, 15_000);

// Compare each emitted operator against the same original expression evaluated in Bun.
const operators = [
  ["add", "number", "a + b"], ["sub", "number", "a - b"], ["mul", "number", "a * b"], ["div", "number", "a / b"],
  ["neg", "number", "-a"], ["round", "number", "Math.round(a)"], ["floor", "number", "Math.floor(a)"],
  ["ceil", "number", "Math.ceil(a)"], ["trunc", "number", "Math.trunc(a)"], ["choose", "number", "a ? a : b"],
  ["eq", "boolean", "a === b"], ["ne", "boolean", "a !== b"], ["lt", "boolean", "a < b"],
  ["le", "boolean", "a <= b"], ["gt", "boolean", "a > b"], ["ge", "boolean", "a >= b"], ["falsy", "boolean", "!a"],
  ["integer", "boolean", "Number.isInteger(a)"], ["nan", "boolean", "Number.isNaN(a)"],
] as const;

leanTest("emitted binary64 operations agree with Bun on boundary pairs and seeded raw bit patterns", async () => {
  const dir = await fixture(), file = join(dir, "operators.ts");
  const source = operators.map(([name, type, expression]) =>
    `export const ${name} = (a: number, b: number): ${type} => ${expression};`).join("\n");
  await writeFile(file, source);
  const native = await import(pathToFileURL(file).href);
  const program = lowerProgram({ file, source, name: "add" });
  const subjects = operators.map(([name]) => program.resolve(file, name));
  const observations = subjects.map(subject =>
    `${subject.result === "number" ? "JSNumber.toBits" : "Bool.toNat"} (${subject.code} a b)`);
  observations.push("JSNumber.toBits (JSNumber.nearestInteger a true)", "JSNumber.toBits (JSNumber.nearestInteger a false)");
  const runner = join(dir, "Numbers.lean");
  await writeFile(runner, `import Std
${numberSemantics}
open Pud
set_option linter.unusedVariables false
${subjects.map(subject => subject.definition).join("\n")}
def main (args : List String) : IO Unit := do
  let input ← IO.FS.readFile args.head!
  for line in input.splitOn "\\n" do
    let words := (line.splitOn " ").map String.toNat!
    let a := JSNumber.ofBits words[0]!
    let b := JSNumber.ofBits words[1]!
    let actual : List Nat := [${observations.join(", ")}]
    unless actual == words.drop 2 do
      throw (IO.userError s!"inputs {words.take 2}, expected {words.drop 2}, obtained {actual}")
`);
  const view = new DataView(new ArrayBuffer(8));
  function bits(x: number) {
    view.setFloat64(0, x);
    return view.getBigUint64(0);
  }
  function number(word: bigint) {
    view.setBigUint64(0, word);
    return view.getFloat64(0);
  }
  const boundary = [0, -0, 0.1, 0.2, 0.5, -0.5, 0.5 - 2 ** -54, -(0.5 + 2 ** -53), 1.005, -1.125, 0.0015,
    1, 1 + Number.EPSILON, 1.5, 2 ** -53, 3 * 2 ** -53, 100, 1000, 2 ** 52, 2 ** 53, 2 ** 970,
    Number.MIN_VALUE, -Number.MIN_VALUE, 2 ** -1022, 2 ** -1022 - Number.MIN_VALUE,
    Number.MAX_VALUE, -Number.MAX_VALUE, Infinity, -Infinity].map(bits);
  boundary.push(0x7ff0000000000001n, 0xfff8000000000001n);
  let seed = 0xa4093822299f31d0n;
  function next() {
    seed ^= BigInt.asUintN(64, seed << 13n);
    seed ^= seed >> 7n;
    seed ^= BigInt.asUintN(64, seed << 17n);
    return seed;
  }
  const pairs = boundary.flatMap(a => boundary.map(b => [a, b] as const));
  for (let i = 0; i < 2048; i++) pairs.push([next(), next()]);
  // Exercise both sides of every change in integer spacing and of the half tie in each binade.
  for (let exponent = -1; exponent <= 52; exponent++) {
    for (const center of [2 ** exponent, 2 ** exponent + 0.5]) {
      for (const offset of [-1n, 0n, 1n]) {
        const value = number(bits(center) + offset);
        for (const signed of [value, -value]) pairs.push([bits(signed), bits(1)]);
      }
    }
  }
  const rows = pairs.map(([a, b]) => {
    const results = operators.map(([name]) => {
      const value = native[name](number(a), number(b));
      if (typeof value === "boolean") return Number(value);
      return Number.isNaN(value) ? 0x7ff8000000000000n : bits(value);
    });
    const x = number(a);
    const policies = [Math.round(x), -Math.round(-x)].map(n => Number.isNaN(n) ? 0x7ff8000000000000n : bits(n));
    return [a, b, ...results, ...policies].join(" ");
  });
  const vectors = join(dir, "vectors");
  await writeFile(vectors, rows.join("\n"));
  const run = Bun.spawnSync([command.binary, "--run", runner, vectors], { env: command.env, timeout: 15_000 });
  expect({ status: run.exitCode, output: run.stdout.toString() + run.stderr.toString() }).toEqual({ status: 0, output: "" });
}, 20_000);

leanTest("numeric proof matchers use JavaScript equality and truthiness", async () => {
  const dir = await fixture(), proof = join(dir, "value.proof.ts");
  await writeFile(join(dir, "value.ts"), "export const identity = (x: number) => x; export const nan = () => 0 / 0;");
  const imports = `import { describe, expect, it, pud } from "pud.dev";
import { identity, nan } from "./value.ts";`;
  await writeFile(proof, imports + `
describe(identity, () => {
  it("compares the result to itself", { x: pud.number() }, ({ x }) => {
    expect(identity(x)).toEqual(identity(x));
  });
});`);
  expect((await check(proof, { adapter })).results[0]).toMatchObject({
    status: "disproved", counterexample: { input: { x: "NaN" }, summary: expect.stringContaining("strict equality") },
  });
  await writeFile(proof, imports + `
describe(nan, () => {
  it("treats NaN as falsy and unordered", {}, ({}) => {
    expect(nan()).to(pud.number().refine(x => !x && x !== x && !(x >= 0) && !(x < 0)));
  });
});`);
  expect((await check(proof, { adapter })).results[0]).toMatchObject({ status: "proved", concreteScope: "no-inputs" });
  await writeFile(proof, imports + `
describe(identity, () => {
  it("uses the global Number with its real binding", { x: pud.number() }, ({ x }) => {
    const Number = identity(x);
    expect(Number).to(pud.number().refine(value => Number.isInteger(value)));
  });
});`);
  expect((await check(proof, { adapter })).results[0]).toMatchObject({ status: "unsupported", detail: expect.stringContaining("unshadowed Number") });
}, 10_000);

leanTest("replay respects scalar guards and leaves an unsupported quantified premise open", async () => {
  const dir = await fixture(), proof = join(dir, "id.proof.ts");
  await cp(join(examples, "pud.config.ts"), join(dir, "pud.config.ts"));
  await writeFile(join(dir, "id.ts"), "export const id = (x: number) => x;");
  await writeFile(proof, [
    'import pud from "./pud.config.ts";',
    'import { lean } from "pud.dev/lean";',
    'import { id } from "./id.ts";',
    'pud.describe(id, ({ it, expect, given }) => {',
    '  it("keeps a nonnegative integer", { x: pud.number() }, ({ x: amount }) => {',
    '    given(Number.isInteger(amount) && amount >= 0);',
    '    expect(id(amount)).to(pud.number().gte(0));',
    '  }).by(lean`by fail "exercise native replay"`);',
    '  it("has an unexecutable premise", { x: pud.number() }, ({ x }) => {',
    '    given(pud.forall(pud.number(), n => n === x));',
    '    expect(id(x)).to(pud.number().eq(0));',
    '  }).by(lean`by fail "exercise native replay"`);',
    '});',
  ].join("\n"));
  expect((await check(proof, { adapter })).results.map(r => r.status)).toEqual(["unproved", "unproved"]);
}, 10_000);

test("mixed numeric operations, unmodeled operators and a shadowed Math.round stay outside the model", () => {
  const input = (source: string) => lowerProgram({ file: "input.ts", source, name: "f" });
  expect(() => input("export const f = (n: number) => n + 1n;")).toThrow("Expected JSNumber");
  expect(() => input("export const f = (n: number) => n % 3;")).toThrow("Unsupported number operator '%'");
  expect(() => input("export const f = (Math: number) => Math.round(1);")).toThrow("unshadowed Math");
  expect(() => input("export const f = (Number: number) => Number.isInteger(Number);")).toThrow("unshadowed Number");
  expect(() => input("const Math = 0; export const f = (n: number) => Math.round(n);")).toThrow("unshadowed Math");
});
