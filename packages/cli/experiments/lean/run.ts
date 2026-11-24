import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { leanReporter, type LeanResult } from "./reporter.ts";
import { readSidecar, type Property } from "./sidecar.ts";
import { leanCommand } from "./toolchain.ts";

const examples = fileURLToPath(new URL("./.examples/", import.meta.url));
const usage = `Usage: bun run demo:lean [FILE.proof.ts ...]
       bun run demo:lean --emit FILE.proof.ts [PROPERTY]

With no files, check every Lean example.
--emit     Print the generated Lean for one property.
--help     Show this help.`;
const trustedAxioms = new Set(["propext", "Quot.sound", "Classical.choice"]);
const autoProof = `by
  simp only [claim]
  intros
  try simp_all [impl, Id.run]
  all_goals (repeat' (first | split | constructor))
  all_goals ((try simp_all) <;> omega)`;

function indent(code: string) { return code.split("\n").map(line => `  ${line}`).join("\n"); }

function snapshots() {
  const seen = new Map<string, { realPath: string; source: string }>();
  return {
    read(file: string) {
      let input = seen.get(file);
      if (!input) {
        const realPath = realpathSync(file);
        input = { realPath, source: readFileSync(realPath, "utf8") };
        seen.set(file, input);
      }
      return input.source;
    },
    confirm() {
      for (const [file, { realPath, source }] of seen) {
        if (realpathSync(file) !== realPath || readFileSync(realPath, "utf8") !== source) {
          throw new Error(`${file} changed during checking. Rerun the proof.`);
        }
      }
    },
  };
}

function generate(definition: string, property: Extract<Property, { kind: "claim" }>, imports: string[]) {
  return [
    "import Std", ...imports.map(module => `import ${module}`), "", "namespace Pud", "", "set_option autoImplicit false", "",
    definition, "", "def claim : Prop :=", indent(property.claim), "",
    "theorem checked : claim :=", indent(property.proof ?? autoProof), "", "end Pud", "",
  ].join("\n");
}

function leanAt(dir: string) {
  const { binary, env } = leanCommand();
  return (module: string, source: string, output = false) => {
    const file = `${module}.lean`;
    const artifact = `${module}.olean`;
    writeFileSync(join(dir, file), source);
    const run = spawnSync(binary, output ? ["-o", artifact, file] : [file], {
      cwd: dir, env: { ...env, LEAN_PATH: dir }, encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024,
    });
    if (run.error && "code" in run.error && run.error.code === "ENOENT") {
      throw new Error("Run bun run setup:lean from the repository root, or set PUD_LEAN to a Lean executable.");
    }
    if (run.error) throw run.error;
    if (run.status !== 0 || (output && !existsSync(join(dir, artifact)))) {
      const log = [run.stdout, run.stderr].filter(Boolean).join("\n").trim();
      throw new Error(log || `Lean failed to check ${file}${run.signal ? ` (${run.signal})` : ""}.`);
    }
    return run.stdout.trim();
  };
}

function audit(module: string, lean: ReturnType<typeof leanAt>) {
  const report = lean("PudAudit", [
    `import ${module}`, "set_option autoImplicit false",
    "theorem pudAuditCertificate : Pud.claim := Pud.checked",
    "#print axioms pudAuditCertificate", "",
  ].join("\n"));
  if (report === "'pudAuditCertificate' does not depend on any axioms") return;
  const axioms = /^'pudAuditCertificate' depends on axioms: \[([^\]]+)\]$/.exec(report)?.[1]?.split(",").map(name => name.trim());
  if (!axioms || axioms.some(name => !trustedAxioms.has(name))) {
    throw new Error(`Lean did not certify the expected claim with approved axioms.\n${report}`);
  }
}

function check(file: string) {
  const input = snapshots();
  const suite = readSidecar(resolve(file), input.read);
  const results: LeanResult[] = [];
  const dir = mkdtempSync(join(tmpdir(), "pud-lean-"));
  try {
    const lean = leanAt(dir);
    const imports = suite.support.map(({ path, source }, i) => {
      const module = `PudSupport${i}`;
      try { lean(module, source, true); }
      catch (error) { throw new Error(`${path}\n${String(error)}`); }
      return module;
    });
    for (const [i, property] of suite.properties.entries()) {
      const { name, line } = property;
      if (property.kind === "todo") {
        results.push({ status: "TODO", name, line });
        continue;
      }
      try {
        const module = `PudClaim${i}`;
        if (!suite.subject) throw new Error("Missing subject for an active property.");
        lean(module, generate(suite.subject.definition, property, imports), true);
        audit(module, lean);
        results.push({ status: "PASS", name, line });
      } catch (error) {
        results.push({ status: "FAIL", name, line, diagnostic: (error as Error).message });
      }
    }
    input.confirm();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return results;
}

function main(args: string[]) {
  if (args.length === 1 && (args[0] === "--help" || args[0] === "-h")) {
    console.log(usage);
    return 0;
  }
  if (args[0] === "--emit") {
    const [, file, title] = args;
    if (!file || args.length > 3) throw new Error(usage);
    const input = snapshots();
    const suite = readSidecar(resolve(file), input.read);
    const active = suite.properties.filter(property => property.kind === "claim");
    const matches = title ? active.filter(property => property.name === title) : active;
    if (!suite.subject || matches.length !== 1) throw new Error(`Select one active property. Available: ${active.map(property => property.name).join(", ") || "none"}`);
    input.confirm();
    process.stdout.write(generate(suite.subject.definition, matches[0]!, suite.support.map((_, i) => `PudSupport${i}`)));
    return 0;
  }
  if (args.some(arg => arg.startsWith("-"))) throw new Error(usage);
  const files = args.length ? args : readdirSync(examples).filter(file => file.endsWith(".proof.ts")).sort().map(file => join(examples, file));
  const reporter = leanReporter(files);
  for (const file of files) {
    const started = performance.now();
    try { reporter.report(file, check(file), performance.now() - started); }
    catch (error) { reporter.error(file, (error as Error).message); }
  }
  return reporter.finish();
}

if (import.meta.main) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
