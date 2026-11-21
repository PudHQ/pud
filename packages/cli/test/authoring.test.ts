import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, emit } from "../src/index.ts";

const cli = Bun.fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const dirs: string[] = [];
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "pud-authoring-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => { for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

test("the library and CLI resolve Bun imports and select the same reviewed property by title", async () => {
  const dir = await fixture(), file = join(dir, "pricing.proof.ts");
  await writeFile(join(dir, "pricing.ts"), "export type Unused = boolean; export function net(n: bigint): bigint { return n; }");
  await writeFile(file, `import { proof as claim } from "@pud/cli";
import { net, type Unused } from "./pricing.js";
export default [claim(net, "Identity", (x, actual) => actual === x),
                claim(net, "Positive", (x, actual) => actual > 0n)] as const;`);
  const fromLib = await emit(file, "Identity");
  expect(fromLib).toContain("ensures (result == p0)");
  const command = Bun.spawnSync([process.execPath, cli, "--emit", file, "Identity"]);
  expect(command.exitCode).toBe(0);
  expect(command.stdout.toString()).toBe(fromLib);

  // An explicit .js file takes precedence over its .ts fallback at runtime.
  await writeFile(join(dir, "pricing.js"), "export function net(n) { return n + 1n; }");
  const fresh = Bun.spawnSync([process.execPath, cli, "check", file, "--json"]);
  expect(fresh.exitCode).toBe(2);
  expect(JSON.parse(fresh.stdout.toString()).files[0].results[0].detail).toContain(".ts implementation");
});

test("a local function named proof cannot execute from a sidecar", async () => {
  const dir = await fixture(), file = join(dir, "f.proof.ts");
  await writeFile(join(dir, "f.ts"), "export function f(): boolean { return true; }");
  await writeFile(join(dir, "helper.ts"), 'throw new Error("This module executed"); export function proof() {}');
  await writeFile(file, 'import { f } from "./f"; import { proof } from "./helper"; export default proof(f, "Intent", (r) => r);');
  const [result] = (await check(file)).results;
  expect(result?.status).toBe("unsupported");
  expect(result?.detail).toContain("proof definition");
});

test("directory selection deduplicates checks and empty discovery produces a JSON diagnostic", async () => {
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
  await writeFile(join(dir, "src/f.proof.ts"), 'import {proof} from "@pud/cli"; import {f} from "./f"; export default proof(f, "Ready", result => result);');
  const found = run(["check", "src", "src/f.proof.ts"]);
  expect(found.code).toBe(1);
  expect(found.report.files).toHaveLength(1);
  expect(found.report.counts.disproved).toBe(1);
  expect(run([]).report).toEqual(found.report);
});

test.skipIf(process.platform === "win32")("discovery includes linked proof files without traversing directory symlinks", async () => {
  const dir = await fixture(), shared = await fixture();
  await writeFile(join(shared, "f.ts"), "export const ok = () => false;");
  await writeFile(join(shared, "shared.proof.ts"), 'import {ok} from "./f"; export default {subject: ok, property: (r) => r};');
  await symlink(join(shared, "shared.proof.ts"), join(dir, "linked.proof.ts"));
  await symlink(dir, join(dir, "loop"));
  const child = Bun.spawnSync([process.execPath, cli, "check", "--json"], { cwd: dir });
  expect(child.exitCode).toBe(1);
  const report = JSON.parse(child.stdout.toString());
  expect(report.files.map((f: { file: string }) => f.file)).toEqual(["linked.proof.ts"]);
  expect(report.files[0].results[0].counterexample.result).toBe("false");
});
