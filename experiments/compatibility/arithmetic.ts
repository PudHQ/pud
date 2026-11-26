import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import { Unsupported } from "../../packages/pud/src/assistant.ts";
import { lowerProgram } from "../../packages/pud/src/lean/program.ts";
import { errorKinds } from "../../packages/pud/src/lean/syntax.ts";
import { runProver } from "../../packages/pud/src/prover-process.ts";
import { parseSourceModule } from "../../packages/pud/src/source.ts";
import { directory, revision } from "./import-test262.ts";
import inventory from "./test262/inventory.json";

export type LeanCommand = { binary: string; env: NodeJS.ProcessEnv };

function reference(source: string, filename: string, strict: boolean) {
  const expected: string[] = [];
  const assert = { sameValue(actual: unknown, oracle: unknown) {
    if (typeof oracle !== "bigint" || !Object.is(actual, oracle)) {
      throw new Error(filename + " failed its upstream oracle in Bun at assertion " + (expected.length + 1));
    }
    expected.push(String(oracle));
  } };
  runInNewContext((strict ? '"use strict";\n' : "") + source, { assert }, { filename, timeout: 5000 });
  return expected;
}

export async function measureArithmetic(temp: string, command: LeanCommand) {
  if (inventory.revision !== revision) throw new Error("Reimport the pinned Test262 inventory.");
  const results = [];
  for (const file of inventory.files) {
    const operator = file.path.split("/").at(-2)!;
    const bytes = readFileSync(join(directory, operator + ".js"));
    const blob = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
    if (blob !== file.blob) throw new Error("Upstream fixture changed: " + file.path);
    const source = bytes.toString();
    const expected = reference(source, file.path, false);
    const strict = reference(source, file.path, true);
    const { body } = parseSourceModule(file.path, source);
    if (!body.length || body.length !== expected.length || JSON.stringify(strict) !== JSON.stringify(expected)) {
      throw new Error("Incomplete assertion inventory in " + file.path);
    }

    const lean = ["import Std", "inductive ErrorKind where | " + Object.values(errorKinds).join(" | ") + " deriving DecidableEq, Repr"];
    const admitted = new Set<number>();
    const unsupported: number[] = [];
    let reason: string | undefined;
    for (const [index, statement] of body.entries()) {
      const call = statement.type === "ExpressionStatement" ? statement.expression : undefined;
      if (call?.type !== "CallExpression" || call.callee.type !== "MemberExpression" || call.callee.computed ||
          call.callee.object.type !== "Identifier" || call.callee.object.name !== "assert" ||
          call.callee.property.type !== "Identifier" || call.callee.property.name !== "sameValue" ||
          call.arguments[0]?.type !== "BinaryExpression") throw new Error("Unmapped assertion in " + file.path);
      const operand = call.arguments[0];
      const expression = source.slice(operand.start!, operand.end!);
      const id = index + 1;
      try {
        const subject = lowerProgram({ name: "probe", file: "probe.ts",
          source: "export const probe = (): bigint => (" + expression + ");" }).root;
        const output = subject.fallible ? '(match impl with | .ok n => toString n | .error e => reprStr e)' : "toString impl";
        lean.push("namespace Case" + id, subject.definition, '#eval IO.println ("case ' + id + ' " ++ ' + output + ")", "end Case" + id);
        admitted.add(id);
      } catch (error) {
        if (!(error instanceof Unsupported)) throw error;
        unsupported.push(id);
        reason ??= error.message.replace(/^probe\.ts:\d+:\d+: /, "");
      }
    }
    if (admitted.size) {
      const leanFile = join(temp, "Arithmetic.lean");
      writeFileSync(leanFile, lean.join("\n") + "\n");
      const run = await runProver(command.binary, [leanFile], { cwd: temp, env: command.env, timeout: 120_000 });
      if (run.status) throw new Error("Lean could not evaluate " + file.path + "\n" + run.stdout + run.stderr);
      for (const line of run.stdout.trim().split(/\r?\n/)) {
        const match = /^case (\d+) (.+)$/.exec(line);
        if (!match) throw new Error("Unexpected Lean output: " + line);
        const id = Number(match[1]);
        if (!admitted.delete(id) || expected[id - 1] !== match[2]) {
          throw new Error(file.path + " assertion " + id + " expected " + expected[id - 1] + ", Lean returned " + match[2]);
        }
      }
      if (admitted.size) throw new Error("Missing Lean observations for " + file.path);
    }
    results.push({ operator, assertions: expected.length, unsupported, ...(reason && { reason }) });
  }
  return results;
}
