import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, emit } from "../src/index.ts";

const cli = join(import.meta.dir, "../src/cli.ts");
const lean = join(import.meta.dir, "../src/lean/index.ts");
const dirs: string[] = [];
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "pud-authoring-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

const pending = `import { describe, it } from "@pud.dev/lib";
import { f } from "./f";
describe(f, () => { it.todo("Ready"); });`;

test("the library and CLI resolve Bun imports and emit the same property by title", async () => {
  const dir = await fixture(), file = join(dir, "pricing.proof.ts");
  await writeFile(join(dir, "pud.config.ts"), `import { leanAdapter } from ${JSON.stringify(lean)};
export default { adapter: leanAdapter() };`);
  await writeFile(join(dir, "pricing.ts"), "export type Unused = boolean; export function net(n: bigint): bigint { return n; }");
  await writeFile(file, `import { describe, expect, it, pud } from "@pud.dev/lib";
import { net, type Unused } from "./pricing.js";
describe(net, () => {
  it("Identity", { n: pud.bigint() }, ({ n }) => { expect(net(n)).to(pud.bigint().eq(n)); });
  it("Positive", { n: pud.bigint() }, ({ n }) => { expect(net(n)).to(pud.bigint().gt(0n)); });
});`);
  const fromLib = await emit(file, "Identity");
  expect(fromLib).toContain("def claim : Prop :=");
  expect(await emit(file, "Positive")).not.toBe(fromLib);
  const command = Bun.spawnSync([process.execPath, cli, "--emit", file, "Identity"]);
  expect(command.exitCode).toBe(0);
  expect(command.stdout.toString()).toBe(fromLib);

  await writeFile(join(dir, "pricing.js"), "export function net(n) { return n + 1n; }");
  const fresh = Bun.spawnSync([process.execPath, cli, "check", file, "--json"]);
  expect(fresh.exitCode).toBe(2);
  expect(JSON.parse(fresh.stdout.toString()).files[0].results[0].detail).toContain(".ts implementation");
});

test("the CLI asks for an adapter when a suite has active claims", async () => {
  const dir = await fixture();
  await writeFile(join(dir, "f.ts"), "export function f(): boolean { return true; }");
  await writeFile(join(dir, "f.proof.ts"), `import { describe, expect, it, pud } from "@pud.dev/lib";
import { f } from "./f";
describe(f, () => {
  it("returns true", {}, ({}) => { expect(f()).to(pud.boolean().eq(true)); });
});`);
  const child = Bun.spawnSync([process.execPath, cli, "check", "--json"], { cwd: dir });
  expect(child.exitCode).toBe(2);
  expect(child.stderr.toString()).toBe("");
  expect(JSON.parse(child.stdout.toString()).files[0].results[0]).toMatchObject({
    status: "error", detail: expect.stringContaining("pud.config.ts"),
  });
});

test("sidecars are parsed as suites and their imports are never run", async () => {
  const dir = await fixture(), file = join(dir, "f.proof.ts");
  await writeFile(join(dir, "f.ts"), "export function f(): boolean { return true; }");
  await writeFile(join(dir, "helper.ts"), 'throw Error("this module ran"); export function describe() {}');
  await writeFile(file, 'import { f } from "./f"; import { describe } from "./helper"; describe(f, () => {});');
  expect((await check(file)).results[0]).toMatchObject({
    status: "unsupported", detail: expect.stringContaining("Use describe"),
  });

  await writeFile(file, 'import { f } from "./f"; export default { subject: f, property: (result) => result };');
  expect((await check(file)).results[0]).toMatchObject({
    status: "unsupported", detail: expect.stringContaining("Declare a suite with describe()"),
  });
});

test("directory selection deduplicates declarations and empty discovery produces a JSON diagnostic", async () => {
  const dir = await fixture();
  function run(args: string[]) {
    const result = Bun.spawnSync([process.execPath, cli, ...args, "--json"], { cwd: dir });
    expect(result.stderr.toString()).toBe("");
    return { code: result.exitCode, report: JSON.parse(result.stdout.toString()) };
  }
  const empty = run([]);
  expect(empty.code).toBe(2);
  expect(empty.report.files).toEqual([]);
  expect(empty.report.counts.error).toBe(1);
  expect(empty.report.errors[0]).toContain("*.proof.ts");
  expect(run(["check", "--invalid"]).code).toBe(2);
  await mkdir(join(dir, "src"));
  await writeFile(join(dir, "src/f.ts"), "export function f(): boolean { return false; }");
  await writeFile(join(dir, "src/f.proof.ts"), pending);
  const found = run(["check", "src", "src/f.proof.ts"]);
  expect(found.code).toBe(0);
  expect(found.report.files).toHaveLength(1);
  expect(found.report.counts.todo).toBe(1);
  expect(run([]).report).toEqual(found.report);
});

test.skipIf(process.platform === "win32")("discovery includes symlinked sidecars without traversing directory symlinks", async () => {
  const dir = await fixture(), shared = await fixture();
  await writeFile(join(shared, "f.ts"), "export const f = () => false;");
  await writeFile(join(shared, "shared.proof.ts"), pending);
  await symlink(join(shared, "shared.proof.ts"), join(dir, "linked.proof.ts"));
  await symlink(dir, join(dir, "loop"));
  const child = Bun.spawnSync([process.execPath, cli, "check", "--json"], { cwd: dir });
  expect(child.exitCode).toBe(0);
  const report = JSON.parse(child.stdout.toString());
  expect(report.files.map((f: { file: string }) => f.file)).toEqual(["linked.proof.ts"]);
  expect(report.files[0].results[0]).toMatchObject({ status: "todo", name: "Ready" });
});
