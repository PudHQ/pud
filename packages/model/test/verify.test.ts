import { expect, test } from "bun:test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, join } from "node:path";
import { verifyFile, verifyPrograms, withDafny } from "../src/verify.ts";

test.serial.skipIf(process.platform === "win32")("reuse the setup probe and verify each new claim, including after a toolchain change", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pud-probe-"));
  const previous = { DAFNY: process.env.DAFNY, PATH: process.env.PATH };
  function install(name: string, executable = "test-dafny") {
    const root = join(dir, name);
    mkdirSync(root, { recursive: true });
    const binary = join(root, executable);
    const prelude = join(root, "DafnyPrelude.bpl");
    const log = join(root, "calls");
    writeFileSync(prelude, "ready");
    writeFileSync(binary, `#!/usr/bin/env bun
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const file = process.argv.at(-1);
const input = readFileSync(file, "utf8");
appendFileSync(join(import.meta.dir, "calls"), file + "\\n");
if (file.endsWith("ToolchainProbe.dfy") && readFileSync(join(import.meta.dir, "DafnyPrelude.bpl"), "utf8") === "damaged") {
  console.error("error: damaged DafnyPrelude.bpl");
  process.exit(2);
}
if (input.includes("ensures false")) process.exit(4);
console.log("Dafny program verifier finished with 1 verified, 0 errors");
`, { mode: 0o755 });
    const calls = () => readFileSync(log, "utf8").trim().split("\n");
    return { root, binary, prelude, calls, probes: () => calls().filter(file => basename(file) === "ToolchainProbe.dfy").length };
  }
  try {
    const a = install("a"), b = install("b");
    process.env.DAFNY = a.binary;
    const verify = (property: string) => verifyPrograms([`method Check() ensures ${property} {}`]);
    const claims = await Promise.all(["true", "true", "true", "true"].map(verify));
    expect(claims).toEqual([[true], [true], [true], [true]]);
    expect(a.probes()).toBe(1);
    expect(new Set(a.calls()).size).toBe(5);
    expect(await verify("false")).toEqual([false]);
    expect(a.calls()).toHaveLength(6);

    appendFileSync(a.binary, "\n");
    expect(await verify("true")).toEqual([true]);
    expect(a.probes()).toBe(2);
    writeFileSync(a.prelude, "damaged");
    for (let i = 0; i < 2; i++) await expect(verify("true")).rejects.toThrow("damaged DafnyPrelude.bpl");
    expect(a.probes()).toBe(4);
    writeFileSync(a.prelude, "repaired");
    expect(await verify("true")).toEqual([true]);
    expect(a.probes()).toBe(5);

    process.env.DAFNY = "test-dafny";
    process.env.PATH = [a.root, previous.PATH].join(delimiter);
    await verify("true");
    expect(a.probes()).toBe(6);
    process.env.PATH = [b.root, previous.PATH].join(delimiter);
    await verify("true");
    expect(b.probes()).toBe(1);
    await expect(withDafny(async check => {
      writeFileSync(b.prelude, "changed during verification");
      return check("method Check() ensures true {}");
    })).rejects.toThrow("changed during verification");

    delete process.env.DAFNY;
    const slots = join("managed", "dafny", "4.11.0", `${process.platform}-${process.arch}`);
    const damaged = install(join(slots, "1"), "dafny"), intact = install(join(slots, "2"), "dafny");
    writeFileSync(damaged.prelude, "damaged");
    expect(await verifyPrograms(["method Check() ensures true {}"], join(dir, "managed"))).toEqual([true]);
    expect(damaged.calls()).toHaveLength(1);
    expect(intact.calls()).toHaveLength(2);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(dir, { recursive: true, force: true });
  }
}, 20_000);

test.skipIf(process.platform === "win32")("an unavailable counterexample flag falls back to checking the same claim", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pud-dafny-option-"));
  try {
    const binary = join(dir, "dafny"), file = join(dir, "Check.dfy"), log = join(dir, "calls");
    writeFileSync(binary, `#!/usr/bin/env bun
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
const source = readFileSync(process.argv.at(-1), "utf8");
const extracting = process.argv.includes("--extract-counterexample");
appendFileSync(join(import.meta.dir, "calls"), extracting + "\\n");
if (extracting) {
  console.error(source.includes("compiler error")
    ? "Error: internal compilation exception while processing --extract-counterexample"
    : "CLI: Error: command-line argument '--extract-counterexample' is neither a recognized option nor a Dafny input file (.dfy, .doo, or .toml).");
  process.exit(1);
}
if (source.includes("ensures false")) process.exit(4);
console.log("Dafny program verifier finished with 1 verified, 0 errors");
`, { mode: 0o755 });
    const suggest = () => { throw new Error("Unexpected counterexample"); };
    writeFileSync(file, "method Check() ensures true {}");
    expect(await verifyFile(binary, file, suggest)).toBe(true);
    writeFileSync(file, "method Check() ensures false {}");
    expect(await verifyFile(binary, file, suggest)).toBe(false);
    writeFileSync(file, "// compiler error\nmethod Check() {}");
    await expect(verifyFile(binary, file, suggest)).rejects.toThrow("internal compilation exception");
    expect(readFileSync(log, "utf8").trim().split("\n")).toEqual(["true", "false", "true", "false", "true"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
