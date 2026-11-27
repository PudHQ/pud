import { expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, checkFiles, emit, Unsupported, type CheckProgress, type ClaimProgress, type ProofAssistant, type ProofClaim, type ProofModule } from "../src/index.ts";
import { leanAdapter } from "../src/lean/index.ts";

const increment = "export function increment(value: bigint): bigint { return value + 1n; }";
const portable = `import { describe, expect, given, it, pud } from "@pud.dev/lib";
import { increment } from "./increment.ts";
describe(increment, () => {
  it("increments the input", { value: pud.int().gte(0n) }, ({ value: input }) => {
    given(input !== 7n);
    expect(increment(input)).to(pud.bigint().eq(input + 1n));
  });
  it.todo("a future property");
});`;

function adapter(verify: (claims: readonly ProofClaim[], modules: readonly ProofModule[], progress?: ClaimProgress) => void | Promise<void>): ProofAssistant<"test"> {
  return {
    id: "test",
    prepare(subject) {
      expect(subject.name).toBe("increment");
      expect(subject.source).toBe(increment);
      return {
        parameters: [{ name: "value", type: { kind: "integer" } }],
        result: { kind: "integer" },
        emit: claim => JSON.stringify(claim.assertions.map(assertion => assertion.kind)),
        async verify(claims, modules, progress) {
          await verify(claims, modules, progress);
          return claims.map(() => ({ status: "unproved", detail: "Test adapter received the claim." }));
        },
      };
    },
  };
}

async function fixture(run: (directory: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "pud-suite-"));
  try {
    await writeFile(join(dir, "increment.ts"), increment);
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("an explicit adapter receives the portable claim and the frozen TypeScript implementation", async () => {
  await fixture(async dir => {
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, portable);
    const selected = adapter((claims, modules) => {
      expect(modules).toEqual([]);
      expect(claims).toHaveLength(1);
      expect(claims[0]?.kind).toBe("return");
      expect(claims[0]?.premises.map(p => p.kind)).toEqual(["comparison", "condition"]);
      expect(claims[0]?.assertions[0]).toMatchObject({ kind: "comparison", operator: "eq", value: { source: "input + 1n" } });
      const clause = claims[0]?.assertions[0];
      if (clause?.kind !== "comparison") throw new Error("Expected a comparison.");
      expect([...clause.value.bindings]).toEqual([["input", "value"]]);
    });
    expect((await check(file, { adapter: selected })).results).toMatchObject([
      { status: "unproved", assistant: "test", name: "increments the input" },
      { status: "todo", name: "a future property" },
    ]);
    expect(await emit(file, { adapter: selected, property: "increments the input" })).toBe('["comparison"]');
  });
});

test("the nearest project config selects the adapter and edited config is reloaded", async () => {
  await fixture(async dir => {
    const projects = join(dir, "project");
    await mkdir(projects);
    await writeFile(join(projects, "increment.ts"), increment);
    const file = join(projects, "increment.proof.ts");
    await writeFile(file, portable);
    function config(id: string) {
      return `export default { adapter: {
        id: "${id}",
        prepare() {
          return {
            parameters: [{ name: "value", type: { kind: "integer" } }],
            result: { kind: "integer" },
            emit() { return "${id}"; },
            async verify(claims) { return claims.map(() => ({ status: "unproved", detail: "Fixture" })); },
          };
        },
      } };`;
    }
    await writeFile(join(dir, "pud.config.ts"), config("outer"));
    const local = join(projects, "pud.config.ts");
    await writeFile(local, config("inner"));
    expect(await emit(file)).toBe("inner");
    await writeFile(local, config("changed"));
    expect((await check(file)).results[0]).toMatchObject({ assistant: "changed", status: "unproved" });
  });
});

test("a batch shares a config instance and concurrent runs reload its transitive imports", async () => {
  await fixture(async dir => {
    const first = join(dir, "first.proof.ts"), second = join(dir, "second.proof.ts");
    const settings = join(dir, "settings.ts");
    await writeFile(first, portable);
    await writeFile(second, portable);
    await writeFile(settings, 'export const label = "old";');
    await writeFile(join(dir, "options.ts"), 'export { label } from "./settings.ts";');
    await writeFile(join(dir, "pud.config.ts"), `import { label } from "./options.ts";
let checks = 0;
export default { adapter: { id: "local", prepare() {
  return { parameters: [{ name: "value", type: { kind: "integer" } }], result: { kind: "integer" },
    emit() { return label; },
    async verify() { return [{ status: "unproved", detail: label + ++checks }]; },
  };
} } };`);
    expect(await emit(first)).toBe("old");
    await writeFile(settings, 'export const label = "new";');
    const [batch, single, unit] = await Promise.all([checkFiles([first, second]), check(first), emit(first)]);
    expect(batch.map(report => report.results[0]?.detail)).toEqual(["new1", "new2"]);
    expect(single.results[0]?.detail).toBe("new1");
    expect(unit).toBe("new");

    const report = await check(first, { onProgress(event) {
      if (event.kind === "validating") writeFileSync(join(dir, "increment.ts"), increment.replace("+ 1n", "- 1n"));
    } });
    expect(report.results[0]).toMatchObject({ status: "error", detail: expect.stringContaining("changed during verification") });
  });
});

test("each active property finishes once across binding errors, adapter updates and returned verdicts", async () => {
  await fixture(async dir => {
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, portable.replace('it.todo("a future property");', `
      it.todo("a future property");
      it("invalid", {}, ({}) => {});
      it("positive step", { value: pud.bigint() }, ({ value }) => {
        expect(increment(value)).to(pud.bigint().gt(value));
      });`));
    const selected = adapter((_claims, _modules, progress) => {
      progress?.(0, "finished", "unproved");
      progress?.(0, "finished", "unproved");
      progress?.(0, "running");
      progress?.(1, "finished");
    });
    const events: CheckProgress[] = [];
    const { results } = await check(file, { adapter: selected, onProgress: event => events.push(event) });
    expect(results.map(result => result.status)).toEqual(["unproved", "todo", "unsupported", "unproved"]);
    expect(events.filter(event => event.kind === "finished").map(event => [event.indices, event.statuses]))
      .toEqual([[[2], ["unsupported"]], [[0], ["unproved"]], [[3], ["unproved"]]]);
    expect(events.filter(event => event.kind === "running").map(event => event.indices)).toEqual([[0, 3]]);
    expect(events.at(-1)).toEqual({ kind: "validating" });
  });
});

test("configured runs preserve emission errors and report a project that exits early", async () => {
  await fixture(async dir => {
    const file = join(dir, "increment.proof.ts"), config = join(dir, "pud.config.ts");
    await expect(emit(file)).rejects.toMatchObject({ code: "ENOENT" });
    await writeFile(file, "export default {};");
    await expect(emit(file)).rejects.toBeInstanceOf(Unsupported);
    await writeFile(file, portable);
    await writeFile(config, 'throw new TypeError("Invalid project settings");');
    await expect(emit(file)).rejects.toBeInstanceOf(TypeError);
    await writeFile(config, "process.exit(7);");
    expect((await check(file)).results).toMatchObject([{ status: "error", detail: expect.stringContaining("exited with 7") }]);
  });
});

test("the Lean adapter accepts an untagged equality and rejects a contradictory claim", async () => {
  await fixture(async dir => {
    const subject = await leanAdapter().prepare({ file: join(dir, "increment.ts"), source: increment, name: "increment" });
    const reference = { kind: "call", callee: "subject", args: [{ kind: "parameter", name: "value" }] } as const;
    const legacy = JSON.parse(JSON.stringify({ premises: [], assertions: [], reference }));
    expect(await subject.emit(legacy, [])).toBe(await subject.emit({ kind: "equal", premises: [], assertions: [], reference }, []));
    const mixed = { ...legacy, kind: "throw", expectedError: "RangeError" };
    expect(await subject.verify([mixed], [])).toMatchObject([{ status: "unsupported" }]);
  });
});

test("quantified refinements keep the domain outside the callback's binding", async () => {
  await fixture(async dir => {
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, portable
      .replace("given(input !== 7n)", "given(pud.forall(pud.boolean(), flag => pud.implies(flag, input !== 7n)))")
      .replace("pud.bigint().eq(input + 1n)", `pud.bigint().refine(result =>
        pud.forall(pud.bigint().gte(result), result => result > input),
      )`));
    const selected = adapter(claims => {
      expect(claims[0]?.premises[1]).toMatchObject({
        kind: "proposition",
        predicate: { kind: "quantifier", quantifier: "forall", domain: { kind: "schema", type: "boolean" } },
      });
      expect(claims[0]?.assertions[0]).toMatchObject({
        kind: "refinement", variable: "result", target: { kind: "result" },
        predicate: { kind: "quantifier", quantifier: "forall", variable: "result",
          domain: { kind: "schema", type: "integer", constraints: [
            { kind: "comparison", target: { kind: "quantified" }, operator: "gte", value: { source: "result" } },
          ] },
        },
      });
    });
    expect((await check(file, { adapter: selected })).results[0]?.status).toBe("unproved");
    const lean = await emit(file, { adapter: leanAdapter() });
    expect(lean).toContain("(∀ (q0 : Bool), ((q0 = true) → (p0 ≠ (7 : Int)))) →");
    expect(lean).toContain("(∀ (q1 : Int), ((q1 ≥ result)) → (q1 > p0))");
  });
});

test("a different adapter receives portable properties and excludes native Lean terms", async () => {
  await fixture(async dir => {
    await writeFile(join(dir, "pud.config.ts"), "throw new Error('The explicit adapter should bypass config evaluation.');");
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, `import { lean } from "@pud.dev/lib/lean";
import pud from "./pud.config.ts";
import { increment } from "./increment.ts";
pud.describe(increment, ({ it, expect, use }) => {
  use(lean.module("./lean-only.lean"));
  it("portable", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().gt(value));
  });
  it("native predicate", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().satisfies(lean\`fun result => result > \${value}\`));
  });
  it("native proof", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().gt(value));
  }).by(lean.ref("Increment.correct"));
  it("native quantified domain", { value: pud.bigint() }, ({ value }) => {
    expect(increment(value)).to(pud.bigint().refine(result =>
      pud.forall(pud.bigint().satisfies(lean.ref("Increment.admits")), other => other > result),
    ));
  });
});`);
    const selected = adapter((claims, modules) => {
      expect(modules).toEqual([]);
      expect(claims).toHaveLength(1);
      expect(claims[0]?.assertions[0]).toMatchObject({ kind: "comparison", operator: "gt" });
    });
    const results = (await check(file, { adapter: selected })).results;
    expect(results.map(result => result.status)).toEqual(["unproved", "unsupported", "unsupported", "unsupported"]);
    expect(results[1]?.detail).toBe("This property uses lean proof code. The selected adapter is test.");
    expect(results[3]?.detail).toBe(results[1]?.detail);
    await expect(emit(file, { adapter: selected, property: "native proof" })).rejects.toThrow("uses lean proof code");
  });
});

test("a change to the implementation invalidates the adapter verdict", async () => {
  await fixture(async dir => {
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, portable);
    const selected = adapter(async () => {
      await writeFile(join(dir, "increment.ts"), increment.replace("+ 1n", "- 1n"));
    });
    const { results } = await check(file, { adapter: selected });
    expect(results.map(result => result.status)).toEqual(["error", "todo"]);
    expect(results[0]?.detail).toContain("increment.ts changed during verification");
  });
});
