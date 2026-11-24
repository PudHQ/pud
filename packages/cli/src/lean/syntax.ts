import type { Node } from "@babel/types";
import { ref, type Expr } from "@pud/model";
import { invalid } from "@pud/model/source";
import { readExpression } from "@pud/model/typescript";

export const leanTypes = {
  integer: "Int",
  boolean: "Bool",
  integers: "List Int",
  items: "List Item",
  textOrItems: "Option (List Item)",
};
export type Sort = keyof typeof leanTypes;
export type Value = { sort: Sort; code: string };

export function isScalar(sort: Sort): sort is "integer" | "boolean" {
  return sort === "integer" || sort === "boolean";
}

export function nameOf(file: string, node: Node | null | undefined): string {
  if (node?.type !== "Identifier" || node.name === "this" || node.optional || node.decorators?.length) {
    return invalid(file, node ?? undefined, "Expected a named binding.");
  }
  return node.name;
}

function arrayElement(type: Node) {
  if (type.type === "TSTypeOperator" && type.operator === "readonly" && type.typeAnnotation.type === "TSArrayType") {
    return type.typeAnnotation.elementType;
  }
}

export function tsSort(
  file: string,
  annotation: Node | null | undefined,
  at: Node,
  registerItem?: (name: string, node: Node) => void,
): Sort {
  function isOpaqueItem(element: Node | undefined) {
    if (!registerItem || element?.type !== "TSTypeReference" || element.typeName.type !== "Identifier" || element.typeArguments) return false;
    registerItem(element.typeName.name, element);
    return true;
  }

  if (annotation?.type === "TSTypeAnnotation") {
    const type = annotation.typeAnnotation;
    if (type.type === "TSBigIntKeyword") return "integer";
    if (type.type === "TSBooleanKeyword") return "boolean";
    const element = arrayElement(type);
    if (element?.type === "TSBigIntKeyword") return "integers";
    if (isOpaqueItem(element)) return "items";
    if (type.type === "TSUnionType" && type.types.length === 2 && type.types.some(branch => branch.type === "TSStringKeyword")) {
      const array = type.types.find(branch => branch.type !== "TSStringKeyword");
      if (array && isOpaqueItem(arrayElement(array))) return "textOrItems";
    }
  }
  return invalid(file, at, "Expected bigint, boolean, a supported readonly array, or a string-or-record-array union.");
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
    if (n.type === "BinaryExpression" && (n.operator === "%" || n.operator === "/")) {
      const operation = n.operator === "%" ? "remainder" : "division";
      if (n.right.type !== "BigIntLiteral" || BigInt(n.right.value) <= 0n) {
        invalid(file, n.right, `Bigint ${operation} needs a positive literal divisor.`);
      }
      const dividend = ofSort(file, n.left, readValue(file, n.left, scope), "integer");
      const leanOperator = n.operator === "%" ? "Int.tmod" : "Int.tdiv";
      return ref("integer", `(${leanOperator} ${dividend} (${BigInt(n.right.value)} : Int))`);
    }
    if (n.type === "BinaryExpression" && n.operator === "<<") {
      if (n.right.type !== "BigIntLiteral") invalid(file, n.right, "Bigint left shift needs a nonnegative literal count.");
      const value = ofSort(file, n.left, readValue(file, n.left, scope), "integer");
      return ref("integer", `(${value} * (2 : Int) ^ (${BigInt(n.right.value)} : Nat))`);
    }
    if (n.type === "BinaryExpression" && n.operator === "&") {
      const mask = n.right.type === "BigIntLiteral" ? BigInt(n.right.value) : undefined;
      if (mask === undefined || (mask & (mask + 1n)) !== 0n) {
        invalid(file, n.right, "Bigint bitwise AND needs a literal mask with only consecutive low bits set.");
      }
      const value = ofSort(file, n.left, readValue(file, n.left, scope), "integer");
      // A low-bit mask is the nonnegative residue, including for negative inputs.
      return ref("integer", `(${value} % (${mask + 1n} : Int))`);
    }
    if (n.type !== "Identifier") return undefined;
    const { sort, code } = lookup(n.name, n);
    if (!isScalar(sort)) invalid(file, n, "Use arrays and unions as whole values.");
    return ref(sort, code);
  });
  if (expr.sort === "string") return invalid(file, node, "Strings are outside the Lean prototype.");
  return { sort: expr.sort, code: emit(expr) };
}

export function ofSort<T extends Sort>(file: string, at: Node, value: Value, expected: T): string {
  if (value.sort !== expected) invalid(file, at, `Expected ${leanTypes[expected]}, got ${leanTypes[value.sort]}.`);
  return value.code;
}
