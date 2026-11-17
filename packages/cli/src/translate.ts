import type { BinaryExpression, FunctionDeclaration, Node, Statement } from "@babel/types";
import { invalid, readModule } from "./source.ts";

type Sort = "Z" | "bool";
type Term = { sort: Sort; code: string };
export interface Model {
  params: Term[];
  body: Term;
}

const integerOps: Partial<Record<BinaryExpression["operator"], [string, Sort]>> = {
  "+": ["Z.add", "Z"], "-": ["Z.sub", "Z"], "*": ["Z.mul", "Z"],
  "<": ["Z.ltb", "bool"], "<=": ["Z.leb", "bool"], ">": ["Z.gtb", "bool"], ">=": ["Z.geb", "bool"],
};

export function translate(file: string, name: string): Model {
  let fn: FunctionDeclaration | undefined;
  for (const stmt of readModule(file).body) {
    const exported = stmt.type === "ExportNamedDeclaration";
    const decl = exported ? stmt.declaration : stmt;
    // Otherwise module initialization could replace the binding we just read.
    if (decl?.type !== "FunctionDeclaration") invalid(file, stmt, "Subject modules may contain only named function declarations.");
    if (exported && decl.id?.name === name) fn = decl;
  }
  if (!fn) throw new Error(`${file}: No named function export '${name}'.`);
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Async, generator and generic functions are unsupported.");

  function sort(annotation: Node | null | undefined, at: Node): Sort {
    if (annotation?.type === "TSTypeAnnotation") {
      if (annotation.typeAnnotation.type === "TSBigIntKeyword") return "Z";
      if (annotation.typeAnnotation.type === "TSBooleanKeyword") return "bool";
    }
    return invalid(file, at, "Use an explicit bigint or boolean type.");
  }
  const bindings = new Map<string, Term>();
  const params = fn.params.map((param, i) => {
    if (param.type !== "Identifier" || param.name === "this" || param.optional || param.decorators?.length) {
      invalid(file, param, "Expected a required, named value parameter.");
    }
    const term = { sort: sort(param.typeAnnotation, param), code: `p${i}` };
    bindings.set(param.name, term);
    return term;
  });
  const resultSort = sort(fn.returnType, fn);

  function apply(node: Node, op: string, input: Sort, output: Sort, ...args: Term[]): Term {
    if (args.some(a => a.sort !== input)) invalid(file, node, `${op} expects ${input === "Z" ? "bigint" : "boolean"} operands.`);
    return { sort: output, code: `(${op} ${args.map(a => a.code).join(" ")})` };
  }
  function choose(node: Node, condition: Term, yes: Term, no: Term): Term {
    if (condition.sort !== "bool" || yes.sort !== no.sort) {
      invalid(file, node, "A conditional needs a boolean test and two branches of the same type.");
    }
    return { sort: yes.sort, code: `(if ${condition.code} then ${yes.code} else ${no.code})` };
  }
  function expr(node: Node): Term {
    switch (node.type) {
      case "Identifier":
        return bindings.get(node.name) ?? invalid(file, node, `Only parameters may be referenced: ${node.name}`);
      case "BigIntLiteral":
        return { sort: "Z", code: `(${node.value}%Z)` };
      case "BooleanLiteral":
        return { sort: "bool", code: String(node.value) };
      case "UnaryExpression":
        if (node.operator === "-") return apply(node, "Z.opp", "Z", "Z", expr(node.argument));
        if (node.operator === "!") return apply(node, "negb", "bool", "bool", expr(node.argument));
        break;
      case "BinaryExpression": {
        const l = expr(node.left), r = expr(node.right);
        const op = integerOps[node.operator];
        if (op) return apply(node, op[0], "Z", op[1], l, r);
        if (node.operator === "===" || node.operator === "!==") {
          const eq = apply(node, l.sort === "Z" ? "Z.eqb" : "Bool.eqb", l.sort, "bool", l, r);
          return node.operator === "===" ? eq : apply(node, "negb", "bool", "bool", eq);
        }
        break;
      }
      case "LogicalExpression":
        if (node.operator === "&&" || node.operator === "||") {
          return apply(node, node.operator === "&&" ? "andb" : "orb", "bool", "bool", expr(node.left), expr(node.right));
        }
        break;
      case "ConditionalExpression":
        return choose(node, expr(node.test), expr(node.consequent), expr(node.alternate));
    }
    return invalid(file, node, `Unsupported TypeScript: ${node.type}${"operator" in node ? ` (${node.operator})` : ""}.`);
  }

  function branch(stmt: Statement): Term {
    return statements(stmt.type === "BlockStatement" ? stmt.body : [stmt], stmt);
  }
  function statements(stmts: Statement[], at: Node): Term {
    const [first, ...rest] = stmts;
    if (first?.type === "ReturnStatement" && first.argument && !rest.length) return expr(first.argument);
    if (first?.type === "IfStatement" && (!first.alternate || !rest.length)) {
      const yes = branch(first.consequent);
      const no = first.alternate ? branch(first.alternate) : statements(rest, first);
      return choose(first, expr(first.test), yes, no);
    }
    return invalid(file, first ?? at, "Expected a return on every path; only return and if/else statements are supported.");
  }

  const body = statements(fn.body.body, fn.body);
  if (body.sort !== resultSort) invalid(file, fn.body, "The returned type does not match the declared return type.");
  return { params, body };
}

export function subjectModule({ params, body }: Model): string {
  const binders = params.map(p => `(${p.code} : ${p.sort})`);
  const args = params.map(p => p.code);
  const signature = [...params.map(p => p.sort), body.sort].join(" -> ");
  const forall = binders.length ? `forall ${binders.join(" ")}, ` : "";
  return [
    "From Stdlib Require Import ZArith Bool.",
    "",
    `Definition ${["impl", ...binders].join(" ")} : ${body.sort} := ${body.code}.`,
    "",
    `Definition agrees (spec : ${signature}) : Prop :=`,
    `  ${forall}${["impl", ...args].join(" ")} = ${["spec", ...args].join(" ")}.`,
    "",
  ].join("\n");
}
