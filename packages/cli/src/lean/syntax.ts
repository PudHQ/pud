import type { CallExpression, Node } from "@babel/types";
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
export type Value = { sort: Sort; code: string; fallible?: boolean };

export const errorKinds = { Error: "error", RangeError: "rangeError", TypeError: "typeError" } as const;

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

function readSpecCall(file: string, node: Node, helpers: ReadonlySet<string> | undefined, read: (node: Node) => Value): Value | undefined {
  if (node.type !== "CallExpression" || node.typeArguments || node.callee.type !== "MemberExpression" || node.callee.computed ||
      node.callee.object.type !== "Identifier" || !helpers?.has(node.callee.object.name) || node.callee.property.type !== "Identifier") return;
  const name = node.callee.property.name;
  if (name === "sum" || name === "length") {
    const [input] = node.arguments;
    if (node.arguments.length !== 1 || !input) invalid(file, node, `Pass one array to pud.${name}().`);
    const value = read(input);
    if (name === "sum") {
      return { sort: "integer", code: `(List.sum ${ofSort(file, input, value, "integers")})` };
    }
    if (value.sort !== "integers" && value.sort !== "items") invalid(file, input, "Pass a supported array to pud.length().");
    return { sort: "integer", code: `(Int.ofNat (List.length ${value.code}))` };
  }
  if (name === "modulo") {
    const [input, divisor] = node.arguments;
    if (node.arguments.length !== 2 || !input || divisor?.type !== "BigIntLiteral" || BigInt(divisor.value) <= 0n) {
      invalid(file, node, "Pass a bigint and a positive literal divisor to pud.modulo().");
    }
    return { sort: "integer", code: `(${ofSort(file, input, read(input), "integer")} % (${BigInt(divisor.value)} : Int))` };
  }
  if (name === "quotient") {
    const [input, divisor] = node.arguments;
    if (node.arguments.length !== 2 || !input || !divisor) invalid(file, node, "Pass two bigints to pud.quotient().");
    const lhs = ofSort(file, input, read(input), "integer"), rhs = ofSort(file, divisor, read(divisor), "integer");
    return { sort: "integer", code: `(Int.tdiv ${lhs} ${rhs})` };
  }
}

export function asOutcome(value: Value): string {
  return value.fallible ? value.code : `(Except.ok (${value.code}))`;
}

/** Sequence exactly the potentially throwing operands in JavaScript evaluation order. */
export function sequence(values: readonly Value[], fresh: () => string, finish: (codes: string[]) => Value): Value {
  const steps: string[] = [];
  const operands = values.map(value => {
    if (!value.fallible) return value.code;
    const name = fresh();
    steps.push(`let ${name} ← ${value.code};`);
    return name;
  });
  const result = finish(operands);
  if (!steps.length) return result;
  return { sort: result.sort, fallible: true, code: `(do ${steps.join(" ")} ${asOutcome(result)})` };
}

export function invoke(callee: { code: string; result: Sort; fallible: boolean }, args: readonly Value[], fresh: () => string): Value {
  return sequence(args, fresh, values => ({
    sort: callee.result,
    fallible: callee.fallible,
    code: values.length ? `(${callee.code} ${values.join(" ")})` : callee.code,
  }));
}

export interface ExecutableExpressions {
  fresh(): string;
  call(node: CallExpression, read: (value: Node) => Value): Value;
  recursive: boolean;
}

export function bigintLiteral(node: Node): bigint | undefined {
  if (node.type === "BigIntLiteral") return BigInt(node.value);
  if (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "BigIntLiteral") {
    return -BigInt(node.argument.value);
  }
}

export function readValue(
  file: string, node: Node, scope: ReadonlyMap<string, Value>, helpers?: ReadonlySet<string>, executable?: ExecutableExpressions,
): Value {
  if (node.type === "Identifier") return scope.get(node.name) ?? invalid(file, node, `Unknown binding '${node.name}'.`);
  const read = (child: Node) => readValue(file, child, scope, helpers, executable);
  const fresh = () => executable?.fresh() ?? invalid(file, node, "A specification expression must be total.");
  const spec = readSpecCall(file, node, helpers, read);
  if (spec) return spec;
  if (node.type === "CallExpression" && executable) return executable.call(node, read);

  if (node.type === "BinaryExpression") {
    const op = node.operator;
    if (op === "/" || op === "%") {
      const divisor = bigintLiteral(node.right);
      if (!executable && (divisor === undefined || divisor === 0n)) {
        invalid(file, node.right, "A specification division or remainder needs a nonzero bigint literal divisor.");
      }
      const left = read(node.left), right = read(node.right);
      ofSort(file, node.left, left, "integer");
      ofSort(file, node.right, right, "integer");
      const operation = op === "%" ? "Int.tmod" : "Int.tdiv";
      return sequence([left, right], fresh, ([lhs, rhs]) => divisor !== undefined && divisor !== 0n
        ? { sort: "integer", code: `(${operation} ${lhs} ${rhs})` }
        : { sort: "integer", fallible: true, code: `(if ${rhs} = 0 then Except.error .rangeError else Except.ok (${operation} ${lhs} ${rhs}))` });
    }
    if (op === "<<" || op === "&") {
      const literal = node.right.type === "BigIntLiteral" ? BigInt(node.right.value) : undefined;
      if (literal === undefined || (op === "&" && (literal & (literal + 1n)) !== 0n)) {
        invalid(file, node.right, op === "<<" ? "Bigint left shift needs a nonnegative literal count."
          : "Bigint bitwise AND needs a literal mask with only consecutive low bits set.");
      }
      const left = read(node.left);
      ofSort(file, node.left, left, "integer");
      return sequence([left], fresh, ([lhs]) => ({ sort: "integer",
        code: op === "<<" ? `(${lhs} * (2 : Int) ^ (${literal} : Nat))` : `(${lhs} % (${literal + 1n} : Int))` }));
    }
  }

  const conditional = (test: Value, yes: Value, no: Value): Value => {
    ofSort(file, node, test, "boolean");
    if (yes.sort !== no.sort) invalid(file, node, "A conditional needs two branches of the same type.");
    const branchesThrow = yes.fallible || no.fallible;
    const premise = executable?.recursive ? `_${fresh()} : ` : "";
    return sequence([test], fresh, ([code]) => ({
      sort: yes.sort, fallible: branchesThrow,
      code: `(if ${premise}${code} then ${branchesThrow ? asOutcome(yes) : yes.code} else ${branchesThrow ? asOutcome(no) : no.code})`,
    }));
  };
  if (node.type === "ConditionalExpression") return conditional(read(node.test), read(node.consequent), read(node.alternate));
  if (node.type === "LogicalExpression" && (node.operator === "&&" || node.operator === "||")) {
    const left = read(node.left), right = read(node.right);
    ofSort(file, node.left, left, "boolean");
    ofSort(file, node.right, right, "boolean");
    if (left.fallible || right.fallible || executable?.recursive) {
      const short = { sort: "boolean" as const, code: node.operator === "&&" ? "false" : "true" };
      return node.operator === "&&" ? conditional(left, right, short) : conditional(left, short, right);
    }
    return { sort: "boolean", code: `(${left.code} ${node.operator} ${right.code})` };
  }

  const operands: Node[] = node.type === "BinaryExpression" ? [node.left, node.right] : node.type === "UnaryExpression" ? [node.argument] : [];
  const values = operands.map(read);
  return sequence(values, fresh, codes => {
    const expr = readExpression(file, node, child => {
      const i = operands.indexOf(child);
      if (i === -1) return;
      // The shared reader checks scalar operand types and chooses the result sort.
      const value = values[i]!;
      if (!isScalar(value.sort)) invalid(file, child, "Use arrays and unions as whole values.");
      return ref(value.sort, codes[i]!);
    });
    if (expr.sort === "string") return invalid(file, node, "Strings are outside the Lean prototype.");
    return { sort: expr.sort, code: emit(expr) };
  });
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
