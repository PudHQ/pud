import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, emit } from "../src/check.ts";
import { readManifest } from "@pud/model/manifest";

const demo = new URL("../demo/", import.meta.url);
const dirs: string[] = [];
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "pud-auto-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

test("one reviewed sidecar handles equivalent edits, small failures and a solver input above Number.MAX_SAFE_INTEGER", async () => {
  const dir = await fixture(), source = join(dir, "seats.ts"), file = join(dir, "seats.proof.ts");
  const original = await readFile(new URL("seats.ts", demo), "utf8");
  const reviewed = await readFile(new URL("seats.proof.ts", demo), "utf8");
  await writeFile(file, reviewed);
  async function run(implementation: string) {
    await writeFile(source, implementation);
    return (await check(file)).results;
  }
  expect((await run(original)).map(r => r.status)).toEqual(["proved", "proved"]);
  const refactor = original.replace("if (requested <= 0n || requested > available) return available;", `{
    const fits: boolean = requested > 0n && requested <= available;
    if (!fits) { return available; }
  }`);
  expect((await run(refactor)).map(r => r.status)).toEqual(["proved", "proved"]);
  const broken = (at: string) => original.replace("const remaining", `if (available === ${at} && requested === 1n) return available;\n  const remaining`);
  const observed = await run(broken("2n"));
  expect(observed.map(r => r.status)).toEqual(["proved", "disproved"]);
  expect(observed[1]?.detail).toContain("reserveSeats(2n, 1n) returned 2n");
  const rare = await run(broken("9007199254740993n"));
  expect(rare.map(r => r.status)).toEqual(["proved", "disproved"]);
  expect(rare[1]?.counterexample?.input).toEqual({ available: "9007199254740993n", requested: "1n" });
  expect(await readFile(file, "utf8")).toBe(reviewed);

  const unsupported = await run(original.replaceAll("bigint", "number").replaceAll("0n", "0"));
  expect(unsupported.map(r => r.status)).toEqual(["unsupported", "unsupported"]);
  expect(unsupported[0]!.detail).toContain(source + ":");
  const cli = Bun.fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const human = Bun.spawnSync([process.execPath, cli, "check", file]);
  expect(human.exitCode).toBe(2);
  expect(human.stderr.toString()).toContain("reserveSeats (2 properties)");
  expect(human.stderr.toString().match(/explicit bigint or boolean/g)).toHaveLength(1);
}, 240_000);

test("each reviewed property binds independently, including aliases and invalid predicates", async () => {
  const dir = await fixture(), file = join(dir, "answer.proof.ts");
  await writeFile(join(dir, "answer.ts"), "export function answer(): bigint { return 42n; }");
  await writeFile(file, `import { answer as current } from "./answer.ts";
    export default [
      { subject: current, name: "invalid", property: (r) => mystery(r) },
      { subject: current, name: "answer", property: (r) => r === 42n },
    ];`);
  expect((await check(file)).results.map(r => [r.name, r.status])).toEqual([["invalid", "unsupported"], ["answer", "proved"]]);
  expect(await emit(readManifest(file)[1]!)).toContain("ensures (result == 42)");
}, 120_000);

test.skipIf(process.platform === "win32")("a misleading solver candidate is never reported as a concrete failure", async () => {
  const dir = await fixture(), file = join(dir, "keep.proof.ts"), binary = join(dir, "dafny");
  await writeFile(join(dir, "keep.ts"), "export function keep(n: bigint): bigint { return n; }");
  await writeFile(file, 'import {keep} from "./keep"; export default {subject: keep, property: (n, r) => r === n};');
  await writeFile(binary, `#!/bin/sh
case "$*" in
  *ToolchainProbe.dfy*) echo "1 verified, 0 errors"; exit 0 ;;
esac
echo "Check.dfy(1,0): initial state:"
echo " assume 7919 == p0;"
echo "0 verified, 1 error"
exit 4
`, { mode: 0o755 });
  const cli = Bun.fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const proc = Bun.spawnSync([process.execPath, cli, "check", "--json", file], { env: { ...process.env, DAFNY: binary } });
  expect(proc.exitCode).toBe(1);
  const [result] = JSON.parse(proc.stdout.toString()).files[0].results;
  expect(result.status).toBe("unproved");
  expect(result.counterexample).toBeUndefined();
});

test("one solver input runs once and can refute a different property that its backend marked proved", async () => {
  const dir = await fixture(), log = join(dir, "observations.log");
  await writeFile(join(dir, "price.ts"), `export function price(tier: bigint): bigint { return tier === 7919n ? 1n : 0n; }`);
  await writeFile(join(dir, "hint.ts"), `import { appendFileSync } from "node:fs";
    import { prepareSubject } from ${JSON.stringify(new URL("../src/automatic.ts", import.meta.url).href)};
    export const hint = {
      backend: { emit() { return ""; }, verify(_model, _claims, suggest) {
        suggest(0, new Map([["p0", 7919n]]));
        suggest(2, new Map([["p0", 7919n]]));
        return [false, true, false];
      } },
      async prepare(source) {
        const { subject } = await prepareSubject({ source: source.file, subject: source.name }, source);
        return { ...subject, observe(input) {
          appendFileSync(${JSON.stringify(log)}, "native replay\\n");
          return subject.observe(input);
        } };
      },
    };`);
  const file = join(dir, "price.proof.ts");
  await writeFile(file, `import { price } from "./price.ts";
    export { hint as adapter } from "./hint.ts";
    export default [
      { subject: price, name: "zero", property: (tier, result) => result === 0n },
      { subject: price, name: "never one", property: (tier, result) => result !== 1n },
      { subject: price, name: "nonnegative", property: (tier, result) => result >= 0n },
    ];`);
  const { results } = await check(file);
  expect(results.map(r => r.status)).toEqual(["disproved", "disproved", "unproved"]);
  expect(results[0]?.counterexample?.input).toEqual({ tier: "7919n" });
  expect(results[1]?.counterexample).toEqual(results[0]?.counterexample);
  expect(results[2]?.counterexample).toBeUndefined();
  expect(await readFile(log, "utf8")).toBe("native replay\n");
});

test("emitting a custom model only binds the reviewed property and never calls replay or a prover", async () => {
  const dir = await fixture(), file = join(dir, "a.proof.ts");
  await writeFile(join(dir, "a.ts"), "export function key(): boolean { return true; }");
  await writeFile(join(dir, "adapter.ts"), `export const example = {
    backend: {
      emit(model, claim) { return model + "\\nensures " + claim; },
      verify() { throw new Error("Verifier was invoked"); },
    },
    prepare(subject) {
      if (subject.name !== "key") throw new Error("Wrong export");
      return {
        model: "key",
        bind(property) { return { claim: property.expression, violation() {} }; },
        replay() { throw new Error("Replay was invoked"); },
      };
    },
  };`);
  await writeFile(file, `import { key as selected } from "./a.ts";
    export { example as adapter } from "./adapter.ts";
    export default { subject: selected, property: (r: boolean) => r };`);
  const cli = Bun.fileURLToPath(new URL("../src/cli.ts", import.meta.url));
  const emitted = Bun.spawnSync([process.execPath, cli, "--emit", file], { env: { ...process.env, DAFNY: join(dir, "missing") } });
  expect(emitted.exitCode).toBe(0);
  expect(emitted.stdout.toString()).toContain("ensures r");
  const checked = Bun.spawnSync([process.execPath, cli, "check", "--json"], { cwd: dir });
  expect(checked.exitCode).toBe(2);
  const { files } = JSON.parse(checked.stdout.toString());
  expect(files[0].results[0]).toMatchObject({ status: "error", detail: "Replay was invoked" });
});

test("Dafny and Rocq certify the same predicate over nested early returns and local bindings", async () => {
  const dir = await fixture(), file = join(dir, "eligible.proof.ts");
  await writeFile(join(dir, "eligible.ts"), `export function eligible(a: boolean, b: boolean): boolean {
    if (a) { if (b) return false; }
    const both: boolean = a && b;
    return !both;
  }`);
  const property = "(a: boolean, b: boolean, r: boolean) => r === !(a && b)";
  await writeFile(file, `import { eligible } from "./eligible.ts";
    export default [
      { subject: eligible, property: ${property} },
      { subject: eligible, property: ${property}, proof: "./Eligible.v", theorem: "eligible_correct" }
    ];`);
  await writeFile(join(dir, "Eligible.v"), `From Pud Require Import Subject.
Theorem eligible_correct : Subject.claim.
Proof. intros a b. destruct a, b; reflexivity. Qed.
`);
  expect((await check(file)).results.map(r => r.status)).toEqual(["proved", "proved"]);
}, 120_000);

test("Dafny and Rocq follow an inferred const arrow through a changed return", async () => {
  const dir = await fixture(), file = join(dir, "seats.proof.ts"), source = join(dir, "seats.ts");
  const original = `export const next = (x: bigint) => x + 1n;
    export function open(x: bigint) { if (x <= 0n) return false; return true; }`;
  const property = "(x, r) => r === x + 1n";
  await writeFile(file, `import { next, open } from "./seats.ts";
    export default [
      { subject: next, property: ${property} },
      { subject: next, property: ${property}, proof: "./Next.v", theorem: "next_correct" },
      { subject: open, property: (x, r) => r === (x > 0n) }
    ];`);
  await writeFile(join(dir, "Next.v"), `From Stdlib Require Import ZArith.
From Pud Require Import Subject.
Theorem next_correct : Subject.claim.
Proof. intro x. unfold Subject.property, Subject.impl. apply Z.eqb_refl. Qed.
`);
  await writeFile(source, original);
  expect((await check(file)).results.map(r => r.status)).toEqual(["proved", "proved", "proved"]);
  await writeFile(source, original.replace("=> x + 1n", "=> { const incremented = x + 1n; return incremented + 1n; }"));
  const { results } = await check(file);
  expect(results.map(r => r.status)).toEqual(["disproved", "disproved", "proved"]);
  expect(results[0]?.counterexample?.result).toBe("2n");
  expect(results[1]?.counterexample).toEqual(results[0]?.counterexample);
}, 120_000);
