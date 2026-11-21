import { expect, test } from "bun:test";
import { parse } from "@babel/parser";
import { selectSubject } from "@pud/model/module";

const subject = "export function max(a: bigint, b: bigint): bigint { return a < b ? b : a; }";

function select(declarations: string) {
  const { program } = parse(subject + "\n" + declarations, { sourceType: "module", plugins: ["typescript"] });
  return selectSubject(program, "bounds.ts", "max");
}

test("isolates the subject among erased types, constant data and unrelated functions", () => {
  expect(select(`
    import type { Flags } from "./options.ts";
    export type { Flags };
    export interface Bounds { limit: bigint }
    type Enabled = boolean;
    export const label = "bounds" as const, limit = -10n;
    function format(a: bigint) { return String(max(a, 0n)); }
  `).id?.name).toBe("max");
});

test.each([
  'import "./setup.ts";',
  'export const label = getLabel();',
  'export const { label } = config;',
  'max = (a, b) => b;',
])("refuses executable module initialization: %s", declaration => {
  expect(() => select(declaration)).toThrow("only named function");
});

test("checks for a later change to the exported binding inside a sibling", () => {
  expect(() => select("export function reset() { max = (a, b) => b; }")).toThrow("may reassign");
});

test("permits member writes, destructuring keys, and local bindings named like the subject", () => {
  expect(select(`
    function format(s: {max: bigint}, x: bigint) {
      s.max = x;
      ({max: x} = s);
      for (const max of [x]) { s.max += max; }
    }
    function local(max: bigint) { max++; }
  `).id?.name).toBe("max");
});

test.each([
  "([{value: max}] = replacements);",
  "({value: max = replacement} = config);",
  "for (max of replacements) {}",
  "(max as typeof max) = replacement;",
  "max! = replacement;",
])("detects a write through the target %s", statement => {
  expect(() => select(`function reset() { ${statement} }`)).toThrow("may reassign");
});
