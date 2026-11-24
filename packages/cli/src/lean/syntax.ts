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

function readSpecCall(file: string, node: Node, helpers: ReadonlySet<string> | undefined, read: (node: Node) => Value): Expr | undefined {
  if (node.type !== "CallExpression" || node.typeArguments || node.callee.type !== "MemberExpression" || node.callee.computed ||
      node.callee.object.type !== "Identifier" || !helpers?.has(node.callee.object.name) || node.callee.property.type !== "Identifier") return;
  const name = node.callee.property.name;
  if (name === "sum" || name === "length") {
    const [input] = node.arguments;
    if (node.arguments.length !== 1 || !input) invalid(file, node, `Pass one array to pud.${name}().`);
    const value = read(input);
    if (name === "sum") {
      return ref("integer", `(List.sum ${ofSort(file, input, value, "integers")})`);
    }
    if (value.sort !== "integers" && value.sort !== "items") invalid(file, input, "Pass a supported array to pud.length().");
    return ref("integer", `(Int.ofNat (List.length ${value.code}))`);
  }
  if (name === "modulo") {
    const [input, divisor] = node.arguments;
    if (node.arguments.length !== 2 || !input || divisor?.type !== "BigIntLiteral" || BigInt(divisor.value) <= 0n) {
      invalid(file, node, "Pass a bigint and a positive literal divisor to pud.modulo().");
    }
    return ref("integer", `(${ofSort(file, input, read(input), "integer")} % (${BigInt(divisor.value)} : Int))`);
  }
}

export function readValue(file: string, node: Node, scope: ReadonlyMap<string, Value>, helpers?: ReadonlySet<string>): Value {
  const lookup = (name: string, at: Node) => scope.get(name) ?? invalid(file, at, `Unknown binding '${name}'.`);
  if (node.type === "Identifier") return lookup(node.name, node);
  const read = (child: Node) => readValue(file, child, scope, helpers);
  const expr = readExpression(file, node, n => {
    const spec = readSpecCall(file, n, helpers, read);
    if (spec) return spec;
    if (n.type === "BinaryExpression" && (n.operator === "%" || n.operator === "/")) {
      const operation = n.operator === "%" ? "remainder" : "division";
      if (n.right.type !== "BigIntLiteral" || BigInt(n.right.value) <= 0n) {
        invalid(file, n.right, `Bigint ${operation} needs a positive literal divisor.`);
      }
      const dividend = ofSort(file, n.left, read(n.left), "integer");
      const leanOperator = n.operator === "%" ? "Int.tmod" : "Int.tdiv";
      return ref("integer", `(${leanOperator} ${dividend} (${BigInt(n.right.value)} : Int))`);
    }
    if (n.type === "BinaryExpression" && n.operator === "<<") {
      if (n.right.type !== "BigIntLiteral") invalid(file, n.right, "Bigint left shift needs a nonnegative literal count.");
      const value = ofSort(file, n.left, read(n.left), "integer");
      return ref("integer", `(${value} * (2 : Int) ^ (${BigInt(n.right.value)} : Nat))`);
    }
    if (n.type === "BinaryExpression" && n.operator === "&") {
      const mask = n.right.type === "BigIntLiteral" ? BigInt(n.right.value) : undefined;
      if (mask === undefined || (mask & (mask + 1n)) !== 0n) {
        invalid(file, n.right, "Bigint bitwise AND needs a literal mask with only consecutive low bits set.");
      }
      const value = ofSort(file, n.left, read(n.left), "integer");
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

export function readProposition(file: string, node: Node, scope: ReadonlyMap<string, Value>, helpers?: ReadonlySet<string>): string {
  const read = (child: Node) => readValue(file, child, scope, helpers);
  const predicate = (child: Node) => readProposition(file, child, scope, helpers);
  if (node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||")) {
    return `(${predicate(node.left)} ${node.operator === "&&" ? "∧" : "∨"} ${predicate(node.right)})`;
  }
  if (node.type === "UnaryExpression" && node.operator === "!") return `(¬ ${predicate(node.argument)})`;
  if (node.type === "BinaryExpression" && Object.hasOwn(comparisons, node.operator)) {
    const left = read(node.left);
    const sort = node.operator === "===" || node.operator === "!==" ? left.sort : "integer";
    if (!isScalar(sort)) invalid(file, node, "Use equality on bigint or boolean values.");
    const lhs = ofSort(file, node.left, left, sort);
    const rhs = ofSort(file, node.right, read(node.right), sort);
    return `(${lhs} ${comparisons[node.operator as keyof typeof comparisons]} ${rhs})`;
  }
  return `(${ofSort(file, node, read(node), "boolean")} = true)`;
}
