import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { translate } from "../src/translate.ts";

const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const demo = fileURLToPath(new URL("../demo/", import.meta.url));
const dirs: string[] = [];
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "pud-test-"));
  dirs.push(dir);
  cpSync(demo, dir, { recursive: true });
  return dir;
}
function singleProofFile(dir: string) {
  const file = join(dir, "single.proof.ts");
  writeFileSync(file, `import { max } from "./bounds.ts";
export default { subject: max, proof: "./Maximum.v", spec: "maximum", theorem: "max_correct" };`);
  return file;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(args: string[], env = process.env) {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8", env });
  if (r.error) throw r.error;
  return { status: r.status, out: r.stdout, err: r.stderr };
}
function edit(file: string, before: string, after: string) {
  const source = readFileSync(file, "utf8");
  expect(source).toContain(before);
  writeFileSync(file, source.replace(before, after));
}

test("bounds proves both functions and reports which one breaks after either implementation changes", () => {
  const dir = fixture(), file = join(dir, "bounds.proof.ts");
  const originalFiles = readdirSync(dir);
  const source = join(dir, "bounds.ts");
  const original = readFileSync(source, "utf8");
  edit(file, "{ max, min }", "{ max as maximum, min }");
  edit(file, "subject: max,", "subject: maximum,");
  const env = { ...process.env, NO_COLOR: "1" };
  const pass = run([file], env);
  expect(pass.err).toBe("");
  expect(pass.status).toBe(0);
  const maxPass = `PASS       max  ${file}:6\n`;
  const minPass = `PASS       min vs minimum  ${file}\n`;
  expect(pass.out).toContain(maxPass + minPass);
  expect(pass.out).toContain("2 passed");

  edit(source, "a < b ? b : a", "a < b ? a : b");
  const fail = run([file], env);
  expect(fail.status).toBe(1);
  expect(fail.out).toBe("");
  expect(fail.err).toContain(minPass);
  expect(fail.err).toContain("1 passed · 1 failed");
  expect(fail.err).toContain(`FAIL       max  ${file}:6\n`);
  expect(fail.err).toContain("maximum(0n, 1n) returned 0n. The property evaluated to false.");
  writeFileSync(source, original.replace("a < b ? a : b", "a < b ? b : a"));
  const verbose = run(["--verbose", file], env);
  expect(verbose.status).toBe(1);
  expect(verbose.err).toContain(maxPass);
  expect(verbose.err).toContain(`UNPROVED   min vs minimum  ${file}\n`);
  expect(verbose.err).toContain("Minimum.v");
  expect(verbose.err).toContain("The linked proof did not compile.");
  expect(readdirSync(dir)).toEqual(originalFiles);
}, 30_000);

test("an agent's proof repair replays against both equivalent bodies with the property unchanged", () => {
  const dir = fixture(), file = join(dir, "bounds.proof.ts");
  const source = join(dir, "bounds.ts");
  const reviewed = readFileSync(file, "utf8");
  const original = readFileSync(source, "utf8");
  edit(source, "a < b ? b : a", "b < a ? a : b");
  const stale = run([file]);
  expect(stale.status).toBe(1);
  expect(stale.err).toMatch(/UNPROVED\s+max/);
  expect(stale.err).toContain("Maximum.v:");
  cpSync(join(dir, "repair", "Maximum.v"), join(dir, "Maximum.v"));
  expect(run([file]).status).toBe(0);
  writeFileSync(source, original);
  expect(run([file]).status).toBe(0);
  expect(readFileSync(file, "utf8")).toBe(reviewed);
}, 30_000);

test("only the generated TS claim can certify a reviewed property", () => {
  const dir = fixture(), file = join(dir, "bounds.proof.ts");
  writeFileSync(join(dir, "Maximum.v"), "Theorem max_correct : True. Proof. exact I. Qed.");
  const swapped = run([file]);
  expect(swapped.status).toBe(1);
  expect(swapped.err).toMatch(/UNPROVED\s+max/);
  expect(swapped.err).toContain("the reviewed TypeScript property");
}, 30_000);

test("finite witness search never certifies an unproved claim", () => {
  const dir = fixture(), file = join(dir, "single.proof.ts");
  writeFileSync(file, `import { max } from "./bounds.ts";
    export default {subject: max, property: (a, b, r) => a !== 100n, proof: "./Absent.v", theorem: "claim"};`);
  const unknown = run([file]);
  expect(unknown.status).toBe(1);
  expect(unknown.err).toMatch(/UNPROVED\s+max/);
  expect(unknown.err).toContain("No proof yet");
  expect(unknown.err).toContain("1 unproved");
}, 30_000);

test("a valid but unrelated theorem does not certify the function", () => {
  const dir = fixture(), file = singleProofFile(dir);
  writeFileSync(join(dir, "Maximum.v"), `From Stdlib Require Import ZArith.
Definition maximum := Z.max.
Theorem max_correct : True. Proof. exact I. Qed.`);
  const r = run([file]);
  expect(r.status).toBe(1);
  expect(r.err).toContain("Expected max_correct to prove Subject.agrees maximum");
}, 30_000);

test("a theorem depending on an admitted lemma fails the independent assumptions check", () => {
  const dir = fixture();
  writeFileSync(join(dir, "Maximum.v"), `From Stdlib Require Import ZArith.
From Pud Require Import Subject.
Definition maximum := Z.max.
Lemma unfinished : Subject.agrees maximum. Admitted.
Theorem max_correct : Subject.agrees maximum. Proof. exact unfinished. Qed.`);
  const r = run([singleProofFile(dir)]);
  expect(r.status).toBe(1);
  expect(r.err).toContain("assumption-free");
  expect(r.err).toContain("unfinished");
}, 30_000);

test("signed bigint arithmetic, boolean guards and large literals agree with an independent Rocq definition", () => {
  const dir = fixture();
  writeFileSync(join(dir, "bounds.ts"), `export function max($x: bigint, flag: boolean): bigint {
    if (flag && $x <= -0x2n) return 9_007_199_254_740_993n + $x * 2n;
    return $x - 1n;
  }`);
  writeFileSync(join(dir, "Maximum.v"), `From Stdlib Require Import ZArith.
From Pud Require Import Subject.
Open Scope Z_scope.
Definition maximum (x : Z) (flag : bool) :=
  if flag then (if x <=? -2 then x * 2 + 9007199254740993 else x - 1) else x - 1.
Theorem max_correct : Subject.agrees maximum.
Proof.
  intros x flag. unfold Subject.impl, maximum. change (Z.opp 2) with (-2).
  destruct flag, (x <=? -2); cbn [andb]; [apply Z.add_comm | reflexivity ..].
Qed.`);
  const r = run([singleProofFile(dir)]);
  expect(r.err).toBe("");
  expect(r.status).toBe(0);
}, 30_000);

test("a nullary boolean function uses strict equality and signed comparisons", () => {
  const dir = fixture();
  writeFileSync(join(dir, "bounds.ts"), `export function max(): boolean {
    return -2n !== 2n && 3n >= 3n && 1n > -1n && !(0n >= 1n)
      && !(1n > 1n) && (false || 4n === 4n) && !(true === false);
  }`);
  writeFileSync(join(dir, "Maximum.v"), `From Pud Require Import Subject.
Definition maximum := true.
Theorem max_correct : Subject.agrees maximum. Proof. reflexivity. Qed.`);
  const r = run([singleProofFile(dir)]);
  expect(r.err).toBe("");
  expect(r.status).toBe(0);
}, 30_000);

test.each([
  ["a number annotation", "export function f(x: number): number { return x + 1; }", "bigint or boolean"],
  ["a mixed sum", "export function f(x: boolean): bigint { return x + 1n; }", "bigint operands"],
  ["a call", "export function f(): bigint { return BigInt(1); }", "CallExpression"],
  ["an erased this parameter", "export function f(this: bigint): bigint { return 0n; }", "value parameter"],
  ["a missing return", "export function f(x: boolean): boolean { if (x) return true; }", "every path"],
  ["a reassigned export", "export function f(): bigint { return 1n; } f = () => 0n;", "only named function"],
])("rejects %s before calling Rocq", (_, source, error) => {
  const file = join(fixture(), "bounds.ts");
  writeFileSync(file, source);
  expect(() => translate(file, "f")).toThrow(error);
});

test("emitting needs no Rocq; a missing compiler is an error, never a proof result", () => {
  const dir = fixture(), file = singleProofFile(dir);
  const env = { ...process.env, NO_COLOR: "1", ROCQ: join(dir, "no-such-rocq") };
  const model = run(["--emit", file], env);
  expect(model.status).toBe(0);
  expect(model.out).toContain("forall (p0 : Z) (p1 : Z), impl p0 p1 = spec p0 p1");
  const check = run([file], env);
  expect(check.status).toBe(2);
  expect(check.err).toContain("ERROR");
  expect(check.err).toContain("Rocq was not found");
});

test("grouped --emit selects the imported binding and reports ambiguous or unknown choices", () => {
  const dir = fixture(), file = join(dir, "bounds.proof.ts");
  edit(file, "{ max, min }", "{ max, min as smallest }");
  edit(file, "subject: min,", "subject: smallest,");
  const env = { ...process.env, ROCQ: join(dir, "missing") };
  const selected = run(["--emit", file, "smallest"], env);
  expect(selected.status).toBe(0);
  expect(selected.out).toContain("then p0 else p1");
  for (const args of [[], ["typo"]]) {
    const r = run(["--emit", file, ...args], env);
    expect(r.status).toBe(2);
    expect(r.out).toBe("");
    expect(r.err).toContain("Available subjects: max, smallest");
  }
});

test("--emit distinguishes different reviewed properties of the same function", () => {
  const dir = fixture(), file = join(dir, "two.proof.ts");
  writeFileSync(file, `import { max } from "./bounds.ts";
    export default [
      {subject: max, property: (a,b,r) => r >= a, theorem: "lowerBound", proof: "./A.v"},
      {subject: max, property: (a,b,r) => r === b || r === a, theorem: "member", proof: "./B.v"}
    ];`);
  expect(run(["--emit", file, "max"]).err).toContain("max.lowerBound, max.member");
  const selected = run(["--emit", file, "max.member"]);
  expect(selected.status).toBe(0);
  expect(selected.out).toContain("orb (Z.eqb result p1) (Z.eqb result p0)");
  expect(selected.out).not.toContain("Z.geb");
});

test.each(["[]", "[,]", "[...checks]", "[makeProof()]"])("rejects an empty or dynamic proof list: %s", value => {
  const dir = fixture(), file = join(dir, "invalid.proof.ts");
  writeFileSync(file, `import { min } from "./bounds.ts"; export default ${value};`);
  const r = run([file]);
  expect(r.status).toBe(2);
  expect(r.err).toContain("1 unsupported");
  expect(r.err).toContain("proof definition");
});

test("the manifest is static, and a bad input doesn't hide subsequent results", () => {
  const dir = fixture(), file = singleProofFile(dir);
  edit(file, 'proof: "./Maximum.v"', 'proof: (() => { throw Error("executed!"); })()');
  const r = run([file, join(dir, "bounds.proof.ts")], { ...process.env, ROCQ: join(dir, "missing") });
  expect(r.status).toBe(2);
  expect(r.err).toContain("literal strings");
  expect(r.err).not.toContain("executed!");
  expect(r.err).toContain("min vs minimum");
});
