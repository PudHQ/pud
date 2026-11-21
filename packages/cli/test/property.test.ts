import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readManifest } from "@pud/model/manifest";
import { check, emit } from "../src/check.ts";
import { translate } from "../src/translate.ts";
import { subjectModule } from "../src/rocq-model.ts";

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

test("both backends prove a block property and replay the edited TypeScript property", async () => {
  const { manifest } = fixture("", "export const f = (cents: bigint) => cents < 0n ? 0n : cents;");
  writeFileSync(join(dirname(manifest), "F.v"), `From Stdlib Require Import ZArith.
    From Pud Require Import Subject.
    Theorem f_correct : Subject.claim.
    Proof. intro x. unfold Subject.property, Subject.impl. cbn zeta.
      destruct (Z.ltb x 0); apply Z.eqb_refl. Qed.`);
  const block = `(cents, result) => {
    const floor: bigint = 0n;
    if (cents < floor) { return result === floor; }
    const quoted = cents;
    return result === quoted;
  }`;
  const sidecar = (property: string) => `import { proof } from "@pud/cli";
    import { f } from "./f.ts";
    export default [proof(f, "Automatic quote", ${property}),
      {subject: f, name: "Linked quote", property: ${property}, proof: "./F.v", theorem: "f_correct"}];`;
  writeFileSync(manifest, sidecar(block));
  expect(await emit(manifest, "Automatic quote")).toContain("ensures (var ");
  expect(await emit(manifest, "Linked quote")).toContain("(let ");
  expect((await check(manifest)).results.map(r => r.status)).toEqual(["proved", "proved"]);
  writeFileSync(manifest, sidecar(block.replace("result === floor", "result > floor")));
  const { results } = await check(manifest);
  expect(results.map(r => r.status)).toEqual(["disproved", "disproved"]);
  for (const result of results) expect(result.counterexample?.input.cents).toBe("-1n");
}, 60_000);

test("block locals keep their lexical scope across if/else branches", () => {
  const { manifest, source } = fixture(`property: (value, result) => {
    if (value < 0n) { const expected = -value; return result === -expected; }
    else { const expected = value; return result === expected; }
  }`);
  const model = translate(source, "f", readManifest(manifest)[0]!.property);
  for (const n of [-2n, 0n, 4n]) {
    expect(model.replay!.holds(n, n)).toBe(true);
    expect(model.replay!.holds(n, n + 1n)).toBe(false);
  }
});

test.each([
  ["export const f = (x: bigint) => { if (x > 0n) return x; return false; };", "All returns must have the same"],
  ["export function f(x: bigint) { if (x > 0n) return x; }", "return on every path"],
  ["export const f = (x: bigint) => { x++; return x; };", "Unsupported TypeScript"],
  ["const offset = 1n; export const f = (x: bigint) => x + offset;", "Only parameters may be referenced"],
  ["export let f = (x: bigint) => x;", "only named functions"],
  ["export function f(x: bigint) { return x; } const reset = () => { f = () => 0n; };", "may reassign"],
  ["export const f: (x: any) => any = (x: bigint) => x + 1n;", "on the arrow function itself"],
])("rejects unchecked return types, mutation and captures in pure exports (%s)", (subject, message) => {
  const { source } = fixture("property: (x, r) => true", subject);
  expect(() => translate(source, "f")).toThrow(message);
});

test.each([
  ["property: (x) => true", "followed by the result"],
  ["property: (x, r: boolean) => true", "type must match"],
  ["property: (x, r): bigint => true", "must return a boolean"],
  ["property: (x, r) => r + x", "must return a boolean"],
  ["property: (x, r) => f(x) === r", "Unsupported TypeScript: CallExpression"],
  ["property: (x, r) => outer === r", "Only parameters may be referenced"],
  ["property: async (x, r) => true", "synchronous arrow"],
  ["property: (x, r) => { if (x === 0n) return true; }", "return on every path"],
  ["property: (x, r) => { if (x === 0n) return true; return r; }", "must return a boolean"],
  ["property: (x, r) => { const before = x; x++; return r === before; }", "Unsupported TypeScript"],
  ["property: (x, r) => { let expected = x; return r === expected; }", "Expected const, if or return"],
  ["property: (x, r) => { const expected = outer; return r === expected; }", "Only parameters may be referenced"],
  ["property: (x = 0n, r) => true", "required, named value"],
  ['property: (x, r) => true, spec: "f_target"', "exactly one"],
  ["property: (x, r) => true, property: (x, r) => false", "Duplicate field"],
])("rejects an invalid reviewed property (%s)", (fields, message) => {
  const { manifest, source } = fixture(fields);
  expect(() => translate(source, "f", readManifest(manifest)[0]!.property)).toThrow(message);
});
