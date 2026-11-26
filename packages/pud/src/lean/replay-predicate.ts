import { parseExpression } from "@babel/parser";
import type { Node } from "@babel/types";
import type { ProofConstraint, ProofExpression, ProofPredicate } from "../assistant.ts";

const comparisons = { eq: "===", gt: ">", gte: ">=", lt: "<", lte: "<=" } as const;
const binary = new Set(["+", "-", "*", "/", "%", "&", "<<", "===", "!==", "<", ">", "<=", ">=", "&&", "||"]);
type Scope = ReadonlyMap<string, string>;

/** Render only admitted scalar expressions. Sidecar statements and native proof terms never run in Bun. */
function operand(expression: ProofExpression, parameters: Scope, locals: Scope): string | undefined {
  function read(node: Node): string | undefined {
    switch (node.type) {
      case "Identifier": return locals.get(node.name) ?? parameters.get(expression.bindings.get(node.name) ?? "");
      case "NumericLiteral": return String(node.value);
      case "BigIntLiteral": return BigInt(node.value).toString() + "n";
      case "BooleanLiteral": return String(node.value);
      case "CallExpression": {
        const method = node.callee;
        if (!expression.numberGlobal || locals.has("Number") || expression.bindings.has("Number") ||
            method.type !== "MemberExpression" || method.computed || method.object.type !== "Identifier" ||
            method.object.name !== "Number" || method.property.type !== "Identifier" ||
            !["isInteger", "isNaN"].includes(method.property.name) || node.arguments.length !== 1) return;
        const arg = read(node.arguments[0]!);
        return arg && "Number." + method.property.name + "(" + arg + ")";
      }
      case "UnaryExpression": {
        const arg = read(node.argument);
        if (arg && ["-", "+", "!"].includes(node.operator)) return "(" + node.operator + arg + ")";
        return;
      }
      case "BinaryExpression":
      case "LogicalExpression": {
        const left = read(node.left), right = read(node.right);
        if (left && right && binary.has(node.operator)) return "(" + left + " " + node.operator + " " + right + ")";
        return;
      }
      case "ConditionalExpression": {
        const test = read(node.test), yes = read(node.consequent), no = read(node.alternate);
        if (test && yes && no) return "(" + test + " ? " + yes + " : " + no + ")";
        return;
      }
    }
  }
  return read(parseExpression(expression.source, { plugins: ["typescript"] }));
}

function predicate(spec: ProofPredicate, parameters: Scope, locals: Scope): string | undefined {
  switch (spec.kind) {
    case "boolean": return operand(spec.expression, parameters, locals);
    case "not": {
      const value = predicate(spec.operand, parameters, locals);
      return value && "!(" + value + ")";
    }
    case "binary": {
      const left = predicate(spec.left, parameters, locals), right = predicate(spec.right, parameters, locals);
      if (!left || !right) return;
      if (spec.operator === "implies") return "(!(" + left + ") || " + right + ")";
      const operator = { iff: "===", and: "&&", or: "||" }[spec.operator];
      return "(" + left + " " + operator + " " + right + ")";
    }
    // A finite sample cannot decide a quantified assertion.
    case "quantifier": return;
  }
}

/** An unavailable premise or assertion disables this replay, so every reported witness is in-domain. */
export function replayConstraints(constraints: readonly ProofConstraint[], parameters: Scope): string | undefined {
  const clauses: string[] = [];
  const empty: Scope = new Map();
  for (const constraint of constraints) {
    let clause: string | undefined;
    if (constraint.kind === "condition") clause = operand(constraint.expression, parameters, empty);
    else if (constraint.kind === "proposition") clause = predicate(constraint.predicate, parameters, empty);
    else {
      const target = constraint.target.kind === "result" ? "received" :
        constraint.target.kind === "parameter" ? parameters.get(constraint.target.name) : undefined;
      if (!target) return;
      if (constraint.kind === "sameValue") {
        const rhs = operand(constraint.value, parameters, empty);
        if (rhs) clause = `Object.is(${target}, ${rhs})`;
      } else if (constraint.kind === "nearestInteger") {
        const rhs = operand(constraint.value, parameters, empty);
        if (rhs) clause = `Object.is(${target}, nearestInteger(${rhs}, ${constraint.ties === "up"}))`;
      } else if (constraint.kind === "comparison") {
        const rhs = operand(constraint.value, parameters, empty);
        if (rhs) clause = "(" + target + " " + comparisons[constraint.operator] + " " + rhs + ")";
      } else if (constraint.kind === "refinement") {
        clause = predicate(constraint.predicate, parameters, new Map([[constraint.variable, target]]));
      }
    }
    if (!clause) return;
    clauses.push(clause);
  }
  return clauses.join(" && ") || "true";
}
