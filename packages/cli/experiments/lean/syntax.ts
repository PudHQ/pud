import type { Node } from "@babel/types";
import { ref, type Expr } from "@pud/model";
import { invalid } from "@pud/model/source";
import { readExpression } from "@pud/model/typescript";

export const leanTypes = { integer: "Int", boolean: "Bool", integers: "List Int" };
export type Sort = keyof typeof leanTypes;
export type Value = { sort: Sort; code: string };

export function nameOf(file: string, node: Node | null | undefined): string {
  if (node?.type !== "Identifier" || node.name === "this" || node.optional || node.decorators?.length) {
    return invalid(file, node ?? undefined, "Expected a named binding.");
  }
  return node.name;
}

export function tsSort(file: string, annotation: Node | null | undefined, at: Node): Sort {
  if (annotation?.type === "TSTypeAnnotation") {
    const type = annotation.typeAnnotation;
    if (type.type === "TSBigIntKeyword") return "integer";
    if (type.type === "TSBooleanKeyword") return "boolean";
    if (type.type === "TSTypeOperator" && type.operator === "readonly" &&
        type.typeAnnotation.type === "TSArrayType" && type.typeAnnotation.elementType.type === "TSBigIntKeyword") return "integers";
  }
  return invalid(file, at, "Expected an explicit bigint, boolean, or readonly bigint[] type.");
}

const comparisons = { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "===": "=", "!==": "≠" } as const;

function emit(expr: Expr): string {
  switch (expr.kind) {
    case "integer": return `(${expr.value} : Int)`;
    case "boolean": return String(expr.value);
    case "reference": return expr.path[0]!;
    case "unary": return `(${expr.op}${emit(expr.arg)})`;
    case "choose": return `(if ${emit(expr.test)} then ${emit(expr.yes)} else ${emit(expr.no)})`;
    case "binary": {
      const lhs = emit(expr.left), rhs = emit(expr.right);
      if (expr.op in comparisons) {
        return `(decide (${lhs} ${comparisons[expr.op as keyof typeof comparisons]} ${rhs}))`;
      }
      return `(${lhs} ${expr.op} ${rhs})`;
    }
    default: throw new Error(`Unexpected expression in Lean lowering: ${expr.kind}`);
  }
}

export function readValue(file: string, node: Node, scope: ReadonlyMap<string, Value>): Value {
  const lookup = (name: string, at: Node) => scope.get(name) ?? invalid(file, at, `Unknown binding '${name}'.`);
  if (node.type === "Identifier") return lookup(node.name, node);
  const expr = readExpression(file, node, n => {
    if (n.type !== "Identifier") return undefined;
    const { sort, code } = lookup(n.name, n);
    if (sort === "integers") invalid(file, n, "Use a readonly bigint[] as a loop source or a whole argument.");
    return ref(sort, code);
  });
  if (expr.sort === "string") return invalid(file, node, "Strings are outside the Lean prototype.");
  return { sort: expr.sort, code: emit(expr) };
}

export function ofSort<T extends Sort>(file: string, at: Node, value: Value, expected: T): string {
  if (value.sort !== expected) invalid(file, at, `Expected ${leanTypes[expected]}, got ${leanTypes[value.sort]}.`);
  return value.code;
}
