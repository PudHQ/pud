import { expect, test } from "bun:test";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pack } from "../scripts/pack.ts";
import { leanCommand } from "../src/lean/command.ts";

test("a Bun project can install the archive offline and use the command, API, and driver types", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-consumer-"));
  const cwd = join(dir, "app");
  const source = join(import.meta.dir, "../.examples/clamp.ts");
  const lean = leanCommand({ file: source, name: "clamp", source: "" }, {});
  const env = { ...lean.env, PUD_LEAN: lean.binary, BUN_INSTALL_CACHE_DIR: join(dir, "empty-cache"), NO_COLOR: "1" };
  function run(args: string[], code = 0) {
    const child = Bun.spawnSync([process.execPath, ...args], { cwd, env, stdout: "pipe", stderr: "pipe" });
    if (child.exitCode !== code) throw new Error(`${args.join(" ")} (exit ${child.exitCode})\n${child.stdout}\n${child.stderr}`);
    return { stdout: child.stdout.toString(), stderr: child.stderr.toString() };
  }
  const config = (options = "") => [
    'import "./diagnostics.cjs";',
    'import { defineConfig } from "@pud.dev/lib";',
    'import { leanAdapter } from "@pud.dev/lib/lean";',
    `export default defineConfig({ adapter: leanAdapter(${options}) });`,
  ].join("\n");
  try {
    const archive = await pack(dir);
    expect(archive).toEndWith("pud.dev-lib-0.0.1.tgz");
    await mkdir(cwd);
    await writeFile(join(cwd, "package.json"), JSON.stringify({ name: "consumer", private: true, type: "module" }));
    run(["add", "--dev", "--offline", archive]);
    await cp(join(import.meta.dir, "../.examples/motion"), join(cwd, "motion"), { recursive: true });
    await writeFile(join(cwd, "quote.ts"), "export function quote(cents: bigint): bigint { return cents - 1n; }");
    const configFile = join(cwd, "pud.config.ts");
    await writeFile(join(cwd, "diagnostics.cjs"), 'console.log("Loading project config"); process.stdout.write("Using Lean\\n");');
    await writeFile(configFile, config('{ executable: "./missing-lean" }'));
    await writeFile(join(cwd, "quote.proof.ts"), [
      'import { describe, expect, it, pud } from "@pud.dev/lib";',
      'import { quote } from "./quote";',
      'describe(quote, () => {',
      '  it("subtracts one cent", { cents: pud.bigint() }, ({ cents }) => {',
      '    expect(quote(cents)).to(pud.bigint().eq(cents - 1n));',
      '  });',
      '});',
    ].join("\n"));
    await writeFile(join(cwd, "native.proof.ts"), [
      'import pud from "./pud.config";',
      'import { lean } from "@pud.dev/lib/lean";',
      'import { quote } from "./quote";',
      'pud.describe(quote, ({ it, expect }) => {',
      '  it("subtracts one cent", { cents: pud.bigint() }, ({ cents }) => {',
      `    expect(quote(cents)).to(pud.bigint().satisfies(lean\`fun (result : Int) => result = \${cents} - 1\`));`,
      '  }).by(lean`by intro cents; rfl`);',
      '});',
    ].join("\n"));
    await writeFile(join(cwd, "types.ts"), [
      'import { check, checkFiles, defineConfig, emit, expect, native, pud, type CheckReport, type ProofCall, type ProofClaim } from "@pud.dev/lib";',
      'import { lean } from "@pud.dev/lib/lean";',
      'import { quote } from "./quote";',
      'const report: CheckReport = await check("quote.proof.ts");',
      'const reports: CheckReport[] = await checkFiles(["quote.proof.ts"]);',
      'const unit: string = await emit("quote.proof.ts", "subtracts one cent");',
      'declare const reference: ProofCall;',
      'const equality: ProofClaim = { kind: "equal", premises: [], assertions: [], reference };',
      '// @ts-expect-error a call equality and an expected exception are separate claims',
      'const contradictory: ProofClaim = { ...equality, expectedError: "RangeError" };',
      'pud.number().gte(0).eq(1.5);',
      'declare const amount: number, values: readonly bigint[];',
      'expect(amount).toExactly(pud.number().nearestIntegerTo(amount, { ties: "up" }));',
      'expect(amount).toExactly(pud.number().sameValue(amount));',
      '// @ts-expect-error select a supported tie policy',
      'pud.number().nearestIntegerTo(amount, { ties: "away" });',
      '// @ts-expect-error exact result schemas currently support scalar returns',
      'expect(values).toExactly(pud.array(pud.bigint()));',
      '// @ts-expect-error a number schema cannot compare against a bigint',
      'pud.number().eq(1n);',
      '// @ts-expect-error portable helpers require a configured native scope',
      'pud.bigint().satisfies(lean`fun _ => True`);',
      'const other = defineConfig({ adapter: { id: "other", prepare() { throw new Error("type fixture"); } } });',
      'const term = native("other");',
      'other.describe(quote, ({ it, expect, use }) => {',
      '  // @ts-expect-error a Lean module cannot be used with the other adapter',
      '  use(lean.module("./helper.lean"));',
      '  use(term.module("./helper.other"));',
      '  const claim = it("subtracts one", { cents: other.bigint() }, ({ cents }) => {',
      '    // @ts-expect-error the inferred argument is bigint',
      '    const wrong: string = cents;',
      '    // @ts-expect-error a Lean term cannot be used with the other adapter',
      '    expect(quote(cents)).to(other.bigint().satisfies(lean`fun _ => True`));',
      '  });',
      '  // @ts-expect-error a Lean theorem cannot certify a property checked by the other adapter',
      '  claim.by(lean.ref("Quote.correct"));',
      '  claim.by(term.ref("Quote.correct"));',
      '});',
    ].join("\n"));
    await writeFile(join(cwd, "tsconfig.json"), JSON.stringify({
      compilerOptions: { module: "preserve", target: "ESNext", strict: true, types: [], noEmit: true, allowImportingTsExtensions: true },
    }));
    const tsc = resolve(import.meta.dir, "../../../node_modules/typescript/bin/tsc");
    run([tsc, "-p", "."]);
    const { stdout: unit, stderr: emitLog } = run(["run", "pud", "--emit", "native.proof.ts"]);
    expect(emitLog).toContain("Loading project config\nUsing Lean");
    expect(unit).toStartWith("import Std\n");
    expect(unit).toContain("def impl (p0 : Int) : Int");
    expect(unit).toContain("result = (p0) - 1");
    expect(unit).toContain("theorem checked : claim");
    expect(run(["-e", 'import { emit } from "@pud.dev/lib"; process.stdout.write(await emit("native.proof.ts"))']).stdout).toBe(unit);

    const missing = run(["run", "pud", "check", "quote.proof.ts", "--json"], 2);
    expect(missing.stderr).toContain("Loading project config\nUsing Lean");
    expect(JSON.parse(missing.stdout).files[0].results[0]).toMatchObject({ status: "error", assistant: "lean" });
    if (Bun.which(lean.binary)) {
      await writeFile(configFile, config());
      const passed = run(["x", "--no-install", "pud", "check", "quote.proof.ts", "--json"]);
      expect(JSON.parse(passed.stdout).files[0].results[0]).toMatchObject({ status: "proved", assistant: "lean" });
      const motion = run(["run", "pud", "check", "motion"]);
      expect(motion.stdout).toContain("6 passed");
      expect(motion.stdout.match(/\[exact result\]/g)).toHaveLength(2);

      await writeFile(join(cwd, "quote.ts"), "export function quote(cents: bigint): bigint { return cents - 2n; }");
      const rejected = run(["run", "pud", "check", "quote.proof.ts", "--json"], 1);
      expect(JSON.parse(rejected.stdout).files[0].results[0]).toMatchObject({ status: "unproved", assistant: "lean" });
      await writeFile(join(cwd, "quote.ts"), "export function quote(cents: bigint): bigint { return cents - 1n; }");
    }

    const alternate = join(cwd, "alternate");
    await mkdir(alternate);
    await writeFile(join(alternate, "identity.proof.ts"), [
      'import { describe, expect, it, pud } from "@pud.dev/lib";',
      'import { quote } from "../quote";',
      'describe(quote, () => {',
      '  it("preserves the amount", { cents: pud.bigint() }, ({ cents }) => {',
      '    expect(quote(cents)).to(pud.bigint().eq(cents));',
      '  });',
      '});',
    ].join("\n"));
    await writeFile(join(alternate, "pud.config.ts"), [
      'import { defineConfig, type ProofAssistant } from "@pud.dev/lib";',
      'import { quote } from "../quote";',
      'const adapter: ProofAssistant<"replay-test"> = {',
      '  id: "replay-test",',
      '  prepare() {',
      '    return {',
      '      parameters: [{ name: "cents", type: { kind: "integer" } }], result: { kind: "integer" },',
      '      emit() { return ""; },',
      '      async verify(claims) {',
      '        const result = quote(0n);',
      '        const received = result.toString() + "n";',
      '        return claims.map(() => result === 0n ? { status: "unproved", detail: "No witness" } : {',
      '          status: "disproved", counterexample: { summary: "The amount changed.", input: { cents: "0n" },',
      '            result: received, difference: { subject: "Quote", expected: "0n", received } },',
      '        });',
      '      },',
      '    };',
      '  },',
      '};',
      'export default defineConfig({ adapter });',
    ].join("\n"));
    const replay = run(["run", "pud", "check", "alternate"], 1);
    expect(replay.stdout).toBe("");
    expect(replay.stderr).toContain("FAIL       preserves the amount");
    expect(replay.stderr).toContain("Expected  0n");
    expect(replay.stderr).toContain("Received  -1n");

    const notices = await readFile(join(cwd, "node_modules/@pud.dev/lib/THIRD-PARTY-NOTICES"), "utf8");
    expect(notices).toContain("@babel/parser@");
    expect(notices).toContain("chalk@");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 40_000);
