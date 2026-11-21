import { expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pack } from "../scripts/pack.ts";

test("an unrelated TypeScript app can install the archive offline, typecheck a sidecar and run it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-consumer-"));
  const cwd = join(dir, "app");
  const env = { ...process.env, BUN_INSTALL_CACHE_DIR: join(dir, "empty-cache"), NO_COLOR: "1" };
  function run(args: string[], code = 0) {
    const child = Bun.spawnSync([process.execPath, ...args], { cwd, env, stdout: "pipe", stderr: "pipe" });
    if (child.exitCode !== code) throw new Error(`${args.join(" ")} (exit ${child.exitCode})\n${child.stdout}\n${child.stderr}`);
    return child.stdout.toString();
  }
  try {
    const archive = await pack(dir);
    await mkdir(cwd);
    await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
    run(["add", "--dev", "--offline", archive]);
    await writeFile(join(cwd, "quote.ts"), "export function quote(cents: bigint): bigint { return cents - 1n; }");
    await writeFile(join(cwd, "quote.proof.ts"), [
      'import { proof } from "@pud/cli";',
      'import { quote } from "./quote";',
      'export default proof(quote, "Preserves the quoted cents", (cents, result) => result === cents);',
    ].join("\n"));
    await writeFile(join(cwd, "types.ts"), [
      'import { check, checkFiles, emit, proof, type CheckReport } from "@pud/cli";',
      'import { quote } from "./quote";',
      'const report: CheckReport = await check("quote.proof.ts");',
      'const reports: CheckReport[] = await checkFiles(["quote.proof.ts"]);',
      'const predicate = proof(quote, "Has an inferred signature", (cents, result) => {',
      '  const values: bigint[] = [cents, result];',
      '  // @ts-expect-error the inferred value is bigint',
      '  const wrong: string = result;',
      '  return values[0] === values[1];',
      '});',
      'const unit: string = await emit("quote.proof.ts", "Preserves the quoted cents");',
    ].join("\n"));
    await writeFile(join(cwd, "tsconfig.json"), JSON.stringify({
      compilerOptions: { module: "preserve", target: "ESNext", strict: true, types: [], noEmit: true },
    }));
    await writeFile(join(cwd, "pricing-adapter.ts"), [
      'import { Unsupported, type DomainAdapter } from "@pud/cli";',
      'export const pricing: DomainAdapter<never, never, never> = {',
      '  prepare(subject) { throw new Unsupported("Missing pricing model for " + subject.name); },',
      '  backend: { emit() { throw Error("Unexpected emission"); }, async verify() { throw Error("Unexpected verification"); } },',
      '};',
    ].join("\n"));
    const tsc = resolve(import.meta.dir, "../../../node_modules/typescript/bin/tsc");
    run([tsc, "-p", "."]);
    const unit = run(["run", "pud", "--emit", "quote.proof.ts"]);
    expect(unit).toContain("ensures");
    const libUnit = run(["-e", 'import { emit } from "@pud/cli"; process.stdout.write(await emit("quote.proof.ts", "Preserves the quoted cents"))']);
    expect(libUnit).toBe(unit);
    const cli = JSON.parse(run(["run", "pud", "check", "--json"], 1));
    expect(cli.counts.disproved).toBe(1);
    const fromLib = run(["-e", 'import { check } from "@pud/cli"; console.log(JSON.stringify(await check("quote.proof.ts")))']);
    expect(JSON.parse(fromLib)).toEqual(cli.files[0]);
    await writeFile(join(cwd, "custom.proof.ts"),
      'export {pricing as adapter} from "./pricing-adapter";\n' + await readFile(join(cwd, "quote.proof.ts"), "utf8"));
    const custom = JSON.parse(run(["run", "pud", "check", "custom.proof.ts", "--json"], 2));
    expect(custom.files[0].results[0]).toMatchObject({ status: "unsupported", detail: "Missing pricing model for quote" });
    const notices = await readFile(join(cwd, "node_modules/@pud/cli/THIRD-PARTY-NOTICES"), "utf8");
    expect(notices).toContain("@babel/parser@");
    expect(notices).toContain("chalk@");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 30_000);
