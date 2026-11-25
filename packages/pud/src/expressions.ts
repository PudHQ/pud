import type { Node } from "@babel/types";
import { Unsupported } from "./assistant.ts";
import { invalid } from "./source.ts";

/** Typed expressions shared by TypeScript frontends. */
export type Sort = "integer" | "boolean" | "string";
export type BinaryOp = "+" | "-" | "*" | "<" | "<=" | ">" | ">=" | "===" | "!==" | "&&" | "||";
export type Expr =
  | { kind: "integer"; sort: "integer"; value: string }
  | { kind: "boolean"; sort: "boolean"; value: boolean }
  | { kind: "string"; sort: "string"; value: string }
  | { kind: "reference"; sort: Sort; path: string[] }
  | { kind: "unary"; sort: Sort; op: "!" | "-"; arg: Expr }
  | { kind: "binary"; sort: Sort; op: BinaryOp; left: Expr; right: Expr }
  | { kind: "choose"; sort: Sort; test: Expr; yes: Expr; no: Expr };

export const integer = (value: bigint): Expr => ({ kind: "integer", sort: "integer", value: value.toString() });
export const bool = (value: boolean): Expr => ({ kind: "boolean", sort: "boolean", value });
export const string = (value: string): Expr => ({ kind: "string", sort: "string", value });
export const ref = (sort: Sort, ...path: string[]): Expr => ({ kind: "reference", sort, path });

export function unary(op: "!" | "-", arg: Expr): Expr {
  const sort = op === "!" ? "boolean" : "integer";
  if (arg.sort !== sort) throw new Error(`${op} expects ${sort === "integer" ? "bigint" : sort} operands.`);
  return { kind: "unary", sort, op, arg };
}

export function binary(op: BinaryOp, left: Expr, right: Expr): Expr {
  const input = op === "===" || op === "!==" ? left.sort : op === "&&" || op === "||" ? "boolean" : "integer";
  if (left.sort !== input || right.sort !== input) throw new Error(`${op} expects ${input === "integer" ? "bigint" : input} operands.`);
  const sort = op === "+" || op === "-" || op === "*" ? "integer" : "boolean";
  return { kind: "binary", sort, op, left, right };
}

export function choose(test: Expr, yes: Expr, no: Expr): Expr {
  if (test.sort !== "boolean" || yes.sort !== no.sort) throw new Error("A conditional needs a boolean test and two branches of the same type.");
  return { kind: "choose", sort: yes.sort, test, yes, no };
}

const operators = new Set<string>(["+", "-", "*", "<", "<=", ">", ">=", "===", "!==", "&&", "||"]);

/** The caller supplies the meanings of names and domain-specific observations. */
export function readExpression(file: string, node: Node, resolve: (node: Node) => Expr | undefined): Expr {
  const read = (n: Node) => readExpression(file, n, resolve);
  const existing = resolve(node);
  if (existing) return existing;
  try {
    switch (node.type) {
      case "BooleanLiteral": return bool(node.value);
      case "BigIntLiteral": return integer(BigInt(node.value));
      case "UnaryExpression":
        if (node.operator === "-" || node.operator === "!") return unary(node.operator, read(node.argument));
        break;
      case "BinaryExpression":
      case "LogicalExpression":
        if (operators.has(node.operator)) return binary(node.operator as BinaryOp, read(node.left), read(node.right));
        break;
      case "ConditionalExpression": return choose(read(node.test), read(node.consequent), read(node.alternate));
    }
  } catch (error) {
    if (error instanceof Unsupported) throw error;
    return invalid(file, node, (error as Error).message);
  }
  return invalid(file, node, `Unsupported TypeScript: ${node.type}${"operator" in node ? ` (${node.operator})` : ""}.`);
}
