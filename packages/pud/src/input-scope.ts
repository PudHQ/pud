import { parseExpression } from "@babel/parser";
import type { Node } from "@babel/types";
import type { PreparedProofAssistant, ProofClaim, ProofExpression, ProofPredicate } from "./assistant.ts";

export type ConcreteScope = "literal-inputs" | "no-inputs";

const forward = { "===": "eq", "<=": "lte", ">=": "gte" } as const;
const reversed = { "===": "eq", "<=": "gte", ">=": "lte" } as const;

function literal(node: Node): string | undefined {
  if (node.type === "BooleanLiteral") return String(node.value);
  const negative = node.type === "UnaryExpression" && node.operator === "-";
  const value = negative ? node.argument : node;
  if (value.type === "NumericLiteral") return String(negative ? -value.value : value.value);
  if (value.type === "BigIntLiteral") return String(negative ? -BigInt(value.value) : BigInt(value.value)) + "n";
}

function quantified(spec: ProofPredicate): boolean {
  if (spec.kind === "quantifier") return true;
  if (spec.kind === "not") return quantified(spec.operand);
  return spec.kind === "binary" && (quantified(spec.left) || quantified(spec.right));
}

/** Recognize explicit literal constraints. An unclassified domain can still be empty or have one member. */
export function concreteScope(parameters: PreparedProofAssistant["parameters"], claim: ProofClaim): ConcreteScope | undefined {
  if (claim.assertions.some(a => (a.kind === "refinement" || a.kind === "proposition") && quantified(a.predicate))) return;
  if (!parameters.length) return "no-inputs";
  const fixed = new Set<string>();
  const bounds = new Map<string, { lower: Set<string>; upper: Set<string> }>();
  function constrain(name: string, operator: "eq" | "gte" | "lte", node: Node) {
    const value = literal(node);
    if (value === undefined) return;
    if (operator === "eq") { fixed.add(name); return; }
    const range = bounds.get(name) ?? { lower: new Set<string>(), upper: new Set<string>() };
    bounds.set(name, range);
    range[operator === "gte" ? "lower" : "upper"].add(value);
    if (range.lower.has(value) && range.upper.has(value)) fixed.add(name);
  }
  function equalities(expression: ProofExpression, local?: readonly [string, string]) {
    const visit = (node: Node) => {
      if (node.type === "LogicalExpression" && node.operator === "&&") { visit(node.left); visit(node.right); }
      if (node.type !== "BinaryExpression") return;
      const { left, right, operator } = node;
      if (operator !== "===" && operator !== "<=" && operator !== ">=") return;
      const variable = left.type === "Identifier" ? left : right.type === "Identifier" ? right : undefined;
      if (!variable) return;
      const name = local?.[0] === variable.name ? local[1] : expression.bindings.get(variable.name);
      if (!name) return;
      if (variable === left) constrain(name, forward[operator], right);
      else constrain(name, reversed[operator], left);
    };
    visit(parseExpression(expression.source, { plugins: ["typescript"] }));
  }
  function facts(spec: ProofPredicate, local?: readonly [string, string]) {
    if (spec.kind === "boolean") equalities(spec.expression, local);
    if (spec.kind === "binary" && spec.operator === "and") { facts(spec.left, local); facts(spec.right, local); }
  }
  for (const premise of claim.premises) {
    if (premise.kind === "condition") equalities(premise.expression);
    if (premise.kind === "proposition") facts(premise.predicate);
    if (premise.kind === "refinement" && premise.target.kind === "parameter") facts(premise.predicate, [premise.variable, premise.target.name]);
    if ((premise.kind === "sameValue" || premise.kind === "nearestInteger") && premise.target.kind === "parameter") {
      constrain(premise.target.name, "eq", parseExpression(premise.value.source, { plugins: ["typescript"] }));
    }
    if (premise.kind === "comparison" && premise.target.kind === "parameter" &&
        (premise.operator === "eq" || premise.operator === "gte" || premise.operator === "lte")) {
      constrain(premise.target.name, premise.operator, parseExpression(premise.value.source, { plugins: ["typescript"] }));
    }
  }
  if (parameters.every(p => fixed.has(p.name))) return "literal-inputs";
}
