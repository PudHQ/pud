import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check, emit, type ProofAssistant, type ProofClaim, type ProofModule } from "../src/index.ts";

const increment = "export function increment(value: bigint): bigint { return value + 1n; }";
const portable = `import { describe, expect, given, it, pud } from "@pud/cli";
import { increment } from "./increment.ts";
describe(increment, () => {
  it("increments the input", { value: pud.int().gte(0n) }, ({ value: input }) => {
    given(input !== 7n);
    expect(increment(input)).to(pud.bigint().eq(input + 1n));
  });
  it.todo("a future property");
});`;

function adapter(verify: (claims: readonly ProofClaim[], modules: readonly ProofModule[]) => void | Promise<void>): ProofAssistant<"test"> {
  return {
    id: "test",
    prepare(subject) {
      expect(subject.name).toBe("increment");
      expect(subject.source).toBe(increment);
      return {
        parameters: [{ name: "value", type: { kind: "integer" } }],
        result: { kind: "integer" },
        emit: claim => JSON.stringify(claim.assertions.map(assertion => assertion.kind)),
        async verify(claims, modules) {
          await verify(claims, modules);
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

test("a different adapter receives portable properties and excludes native Lean terms", async () => {
  await fixture(async dir => {
    await writeFile(join(dir, "pud.config.ts"), "throw new Error('The explicit adapter should bypass config evaluation.');");
    const file = join(dir, "increment.proof.ts");
    await writeFile(file, `import { lean } from "@pud/cli/lean";
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
});`);
    const selected = adapter((claims, modules) => {
      expect(modules).toEqual([]);
      expect(claims).toHaveLength(1);
      expect(claims[0]?.assertions[0]).toMatchObject({ kind: "comparison", operator: "gt" });
    });
    const results = (await check(file, { adapter: selected })).results;
    expect(results.map(result => result.status)).toEqual(["unproved", "unsupported", "unsupported"]);
    expect(results[1]?.detail).toBe("This property uses lean proof code. The selected adapter is test.");
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
