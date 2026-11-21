import type { Expr, Sort, Statement } from "./model.ts";
import type { DomainAdapter, ProofBackend } from "./adapter.ts";
import { withDafny, type DafnyInput } from "./verify.ts";

export const dafnySort: Record<Sort, string> = { integer: "int", boolean: "bool", string: "string" };

export interface Method {
  parameters: string;
  result: string;
  body: string;
  declarations?: string;
  requires?: string;
}

export function verificationUnit(method: Method, postcondition: string | readonly string[]): string {
  const claims = typeof postcondition === "string" ? [postcondition] : postcondition;
  return [
    method.declarations, `method Check(${method.parameters}) returns (${method.result})`,
    method.requires && `  requires ${method.requires}`, ...claims.map(claim => `  ensures ${claim}`), "{", method.body, "}", "",
  ].filter(line => line !== undefined).join("\n");
}

export type DafnyAdapter<Observation> = DomainAdapter<Observation, Method, string, DafnyInput>;
export const dafny: ProofBackend<Method, string, DafnyInput> = {
  emit: verificationUnit,
  async verify(method, claims, suggest) {
    if (!claims.length) return [];
    return withDafny(async verify => {
      // One successful verification establishes every ensures clause. A failed batch
      // gives no individual verdict, so check each obligation separately in that case.
      if (claims.length > 1 && await verify(verificationUnit(method, claims))) return claims.map(() => true);
      const results = [];
      for (const [i, claim] of claims.entries()) {
        results.push(await verify(verificationUnit(method, claim), suggest && (input => suggest(i, input))));
      }
      return results;
    });
  },
};

export function expression(e: Expr): string {
  switch (e.kind) {
    case "integer": return e.value;
    case "boolean": return String(e.value);
    case "string":
      if (/[^\x20-\x7e\n\r\t]/.test(e.value)) throw new Error("Unsupported character in Dafny string literal.");
      return JSON.stringify(e.value);
    case "reference": return e.path.join(".");
    case "let": return `(var ${e.name} := ${expression(e.value)}; ${expression(e.body)})`;
    case "unary": return `(${e.op}${expression(e.arg)})`;
    case "binary": {
      const op = e.op === "===" ? "==" : e.op === "!==" ? "!=" : e.op;
      return `(${expression(e.left)} ${op} ${expression(e.right)})`;
    }
    case "choose": return `(if ${expression(e.test)} then ${expression(e.yes)} else ${expression(e.no)})`;
  }
}

interface Operations<E, R> {
  returned(value: R): string;
  effect(step: E): string;
}

export function statements<E, R>(body: Statement<E, R>[], operations: Operations<E, R>, indent = "  "): string {
  const lines: string[] = [];
  for (const node of body) {
    switch (node.kind) {
      case "let": lines.push(`${indent}var ${node.name} := ${expression(node.value)};`); break;
      case "return": lines.push(indent + operations.returned(node.value)); break;
      case "effect": lines.push(...operations.effect(node.effect).split("\n").map(line => indent + line)); break;
      case "if":
        lines.push(`${indent}if ${expression(node.test)} {`, statements(node.yes, operations, indent + "  "));
        if (node.no.length) lines.push(indent + "} else {", statements(node.no, operations, indent + "  "));
        lines.push(indent + "}");
        break;
    }
  }
  return lines.filter(Boolean).join("\n");
}
