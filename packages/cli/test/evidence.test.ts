import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { readManifest } from "@pud/model/manifest";
import { check, checkFiles, emit } from "../src/check.ts";

const dirs: string[] = [];

function fixture() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "pud-evidence-")));
  dirs.push(dir);
  return (name: string, source: string) => {
    const file = join(dir, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
    return file;
  };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test("each failed property keeps its first observed witness in either declaration order", async () => {
  const write = fixture();
  write("seats.ts", "export function seats(x: bigint): bigint { return x; }");
  const later = '{ subject: seats, name: "never one", property: (x, r) => r !== 1n }';
  const earlier = '{ subject: seats, name: "over one", property: (x, r) => r > 1n }';
  for (const claims of [[earlier, later], [later, earlier]]) {
    const file = write("seats.proof.ts", `import { seats } from "./seats.ts"; export default [${claims.join(",")}];`);
    const { results } = await check(file);
    expect(results.map(r => r.status)).toEqual(["disproved", "disproved"]);
    expect(Object.fromEntries(results.map(r => [r.name, r.counterexample?.input.x]))).toEqual({
      "over one": "0n", "never one": "1n",
    });
  }
});

test("Rocq and automatic proofs share the original subject through an edit and undo between sidecars", async () => {
  const write = fixture();
  const price = (amount: string) => `export function price(): bigint { return ${amount}; }`;
  const source = write("price.ts", price("0n"));
  const proof = "From Pud Require Import Subject.\nTheorem zero : Subject.claim.\nProof. reflexivity. Qed.\n";
  const script = write("Price.v", proof);
  const claims = 'import { price } from "./price.ts"; export default ';
  const baseline = write("before.proof.ts", claims + '{ subject: price, property: (r) => r === 0n };');
  const during = write("during.proof.ts", claims + `[
    { subject: price, property: (r) => r === 0n, proof: "./Price.v", theorem: "zero" },
    { subject: price, property: (r) => r === 1n }
  ];`);

  // Synchronize edits at exact points in the run without substituting either proof backend.
  write("edits.ts", "export function save() {}\nexport function undo() {}");
  write("editor.ts", `import { writeFileSync } from "node:fs";
    export const editor = {
      backend: { emit() { throw Error("unused"); }, verify() { throw Error("unused"); } },
      prepare(subject) {
        writeFileSync(${JSON.stringify(source)}, subject.name === "save" ? ${JSON.stringify(price("1n"))} : ${JSON.stringify(price("0n"))});
        writeFileSync(${JSON.stringify(script)}, subject.name === "save" ? "An incomplete proof." : ${JSON.stringify(proof)});
        throw Error("edit completed");
      }
    };`);
  function edit(name: string) {
    return write(`${name}.proof.ts`, `import { ${name} } from "./edits.ts";
      export { editor as adapter } from "./editor.ts";
      export default { subject: ${name}, property: () => true };`);
  }
  const [first, saved, checked, undone] = await checkFiles([baseline, edit("save"), during, edit("undo")]);
  expect(first!.results[0]!.status).toBe("proved");
  expect(saved!.results[0]!.detail).toBe("edit completed");
  expect(checked!.results.map(r => r.status)).toEqual(["proved", "disproved"]);
  expect(checked!.results[1]!.counterexample?.result).toBe("0n");
  expect(undone!.results[0]!.detail).toBe("edit completed");
}, 120_000);

test("editing a linked proof after certification invalidates its verdict, and emit works before a proof exists", async () => {
  const write = fixture();
  write("price.ts", "export function price(): bigint { return 0n; }");
  const script = write("Price.v", "From Pud Require Import Subject.\nTheorem zero : Subject.claim. Proof. reflexivity. Qed.\n");
  const file = write("price.proof.ts", `import { price } from "./price.ts";
    export default { subject: price, property: (r) => r === 0n, proof: "./Price.v", theorem: "zero" };`);
  const pending = check(file);
  writeFileSync(script, "An incomplete proof.");
  expect((await pending).results[0]).toMatchObject({ status: "error", detail: `${script} changed during verification. Rerun pud check.` });
  expect((await check(file)).results[0]?.status).toBe("unproved");
  unlinkSync(script);
  const absent = (await check(file)).results[0]!;
  expect(absent.status).toBe("unproved");
  expect(absent.detail).toContain("No proof yet");
  expect(await emit(readManifest(file)[0]!)).toContain("Definition claim");
}, 120_000);

test("retargeting a subject symlink invalidates both import spellings and the next library check uses its new target", async () => {
  const write = fixture();
  const old = write("old.ts", "export function price(): bigint { return 0n; }");
  const replacement = write("new.ts", "export function price(): bigint { return 1n; }");
  const link = join(dirname(old), "current.ts");
  symlinkSync(old, link);
  const claim = (specifier: string) => `import { price } from "${specifier}"; export default { subject: price, property: (r) => r === 0n };`;
  const explicit = write("explicit.proof.ts", claim("./current.ts")), implicit = write("implicit.proof.ts", claim("./current"));
  const pending = checkFiles([explicit, implicit]);
  unlinkSync(link);
  symlinkSync(replacement, link);
  expect((await pending).map(r => r.results[0])).toEqual([
    expect.objectContaining({ status: "error", detail: `${link} changed during verification. Rerun pud check.` }),
    expect.objectContaining({ status: "error", detail: `${link} changed during verification. Rerun pud check.` }),
  ]);
  const next = await checkFiles([explicit, implicit]);
  expect(next.map(r => [r.results[0]?.status, r.results[0]?.counterexample?.result])).toEqual([["disproved", "1n"], ["disproved", "1n"]]);
}, 120_000);

test("changed and deleted subjects and edited sidecars invalidate only their own verdicts", async () => {
  const write = fixture();
  const implementation = "export function price(): bigint { return 0n; }";
  const subject = write("price.ts", implementation);
  const deleted = write("removed.ts", implementation);
  write("stable.ts", implementation);
  const claim = (module: string) => `import { price } from "./${module}.ts"; export default { subject: price, property: (r) => r === 0n };`;
  const one = write("before.proof.ts", claim("price")), two = write("after.proof.ts", claim("price"));
  const missing = write("removed.proof.ts", claim("removed")), edited = write("edited.proof.ts", claim("stable"));
  const stable = write("stable.proof.ts", claim("stable"));

  const pending = checkFiles([one, two, missing, edited, stable]);
  writeFileSync(subject, implementation.replace("0n", "1n"));
  unlinkSync(deleted);
  writeFileSync(edited, claim("stable").replace("0n", "1n"));
  const reports = await pending;
  expect(reports.map(r => r.results[0]!.status)).toEqual(["error", "error", "error", "error", "proved"]);
  for (const [index, file] of [subject, subject, deleted, edited].entries()) {
    expect(reports[index]!.results[0]!.detail).toContain(`${file} changed during verification. Rerun pud check.`);
  }
}, 120_000);

test("a symlinked sidecar resolves its subjects and Rocq script from the same directory as Bun", async () => {
  const write = fixture();
  write("original/price.ts", "export function price(): bigint { return 1n; }");
  write("original/Price.v", "From Pud Require Import Subject.\nTheorem one : Subject.claim. Proof. reflexivity. Qed.\n");
  const sidecar = write("original/price.proof.ts", `import { price } from "./price.ts"; export default [
    { subject: price, property: (r) => r === 0n },
    { subject: price, property: (r) => r === 1n, proof: "./Price.v", theorem: "one" }
  ];`);
  const unrelated = write("links/price.ts", "export function price(): bigint { return 0n; }");
  write("links/Price.v", "An incomplete proof.");
  const link = join(dirname(unrelated), "price.proof.ts");
  symlinkSync(sidecar, link);
  expect((await import(link)).default[0].subject()).toBe(1n);
  const report = await check(link);
  expect(report.file).toBe(link);
  expect(report.results.map(r => r.status)).toEqual(["disproved", "proved"]);
  expect(report.results[0]?.counterexample?.result).toBe("1n");
}, 120_000);

test("a file shadowing an extensionless import invalidates that sidecar while its explicit neighbor still proves", async () => {
  const write = fixture();
  write("price.ts", "export function price(): bigint { return 0n; }");
  const claim = (specifier: string) => `import { price } from "${specifier}"; export default { subject: price, property: (r) => r === 0n };`;
  const implicit = write("implicit.proof.ts", claim("./price")), explicit = write("explicit.proof.ts", claim("./price.ts"));
  const pending = checkFiles([implicit, explicit]);
  write("price", "export function price() { return 1n; }");
  expect((await pending).map(r => r.results[0]!.status)).toEqual(["error", "proved"]);
  const next = await check(implicit);
  expect(next.results[0]!.status).toBe("unsupported");
  expect(next.results[0]!.detail).toContain("Pud needs a .ts implementation file");
}, 120_000);
