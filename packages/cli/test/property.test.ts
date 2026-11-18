import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readManifest } from "../src/manifest.ts";
import { subjectModule, translate } from "../src/translate.ts";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture(fields: string, subject = "export function f(value: bigint): bigint { return value; }") {
  const dir = mkdtempSync(join(tmpdir(), "pud-property-"));
  dirs.push(dir);
  const manifest = join(dir, "f.proof.ts");
  const source = join(dir, "f.ts");
  writeFileSync(source, subject);
  writeFileSync(manifest, `import { f } from "./f.ts";
    export default { subject: f, proof: "./F.v", theorem: "f_correct", ${fields} };`);
  return { manifest, source };
}

test("the reviewed predicate binds arguments and result by position and replays the same source snapshot", () => {
  const { manifest, source } = fixture(
    "property: (x, enabled: boolean, output: bigint): boolean => enabled ? output === x + 8n : output === x",
    `export function f(value: bigint, flag: boolean): bigint {
      if (flag) return value /* native bigint arithmetic */ + 0b1_000n;
      return value;
    }`,
  );
  const [proof] = readManifest(manifest);
  writeFileSync(manifest, "the manifest was edited after reading");
  const model = translate(source, "f", proof!.property);
  writeFileSync(source, "the module was edited after translation");
  const rocq = subjectModule(model);
  expect(rocq).toContain("forall (p0 : Z) (p1 : bool), property p0 p1 (impl p0 p1) = true");
  expect(rocq).toContain("(result : Z) : bool :=");
  expect(model.replay!.run(2n ** 100n, true)).toBe(2n ** 100n + 8n);
  expect(model.replay!.holds(1n, true, 9n)).toBe(true);
  expect(model.replay!.holds(1n, true, 1n)).toBe(false);
  expect(model.replay!.holds(1n, false, 1n)).toBe(true);
});

test("a nullary subject's predicate takes only the returned value", () => {
  const { manifest, source } = fixture("property: (answer) => !answer", "export function f(): boolean { return false; }");
  const [proof] = readManifest(manifest);
  const model = translate(source, "f", proof!.property);
  expect(subjectModule(model)).toContain("property (impl) = true");
  expect(model.replay!.holds(model.replay!.run())).toBe(true);
});

test.each([
  ["property: (x) => true", "followed by the result"],
  ["property: (x, r: boolean) => true", "type must match"],
  ["property: (x, r): bigint => true", "must return a boolean"],
  ["property: (x, r) => r + x", "must return a boolean"],
  ["property: (x, r) => f(x) === r", "Unsupported TypeScript: CallExpression"],
  ["property: (x, r) => outer === r", "Only parameters may be referenced"],
  ["property: async (x, r) => true", "synchronous arrow"],
  ["property: (x, r) => { return true; }", "single predicate expression"],
  ["property: (x = 0n, r) => true", "required, named value"],
  ['property: (x, r) => true, spec: "f_target"', "exactly one"],
  ["property: (x, r) => true, property: (x, r) => false", "Duplicate field"],
])("rejects an invalid reviewed property (%s)", (fields, message) => {
  const { manifest, source } = fixture(fields);
  expect(() => translate(source, "f", readManifest(manifest)[0]!.property)).toThrow(message);
});
