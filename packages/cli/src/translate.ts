import type { BinaryExpression, Identifier, Node, Statement } from "@babel/types";
import type { ReviewedProperty } from "./manifest.ts";
import { selectSubject } from "./module.ts";
import { invalid, readSourceModule } from "./source.ts";

type Sort = "Z" | "bool";
type Term = { sort: Sort; code: string };
export type RuntimeValue = bigint | boolean;

export interface Model {
  params: Term[];
  body: Term;
  property?: Term;
  replay?: {
    run(...args: RuntimeValue[]): RuntimeValue;
    holds(...argsAndResult: RuntimeValue[]): boolean;
  };
}

const integerOps: Partial<Record<BinaryExpression["operator"], [string, Sort]>> = {
  "+": ["Z.add", "Z"], "-": ["Z.sub", "Z"], "*": ["Z.mul", "Z"],
  "<": ["Z.ltb", "bool"], "<=": ["Z.leb", "bool"], ">": ["Z.gtb", "bool"], ">=": ["Z.geb", "bool"],
};

function sort(file: string, annotation: Node | null | undefined, at: Node): Sort {
  if (annotation?.type === "TSTypeAnnotation") {
    if (annotation.typeAnnotation.type === "TSBigIntKeyword") return "Z";
    if (annotation.typeAnnotation.type === "TSBooleanKeyword") return "bool";
  }
  return invalid(file, at, "Use an explicit bigint or boolean type.");
}

function identifier(file: string, param: Node): Identifier {
  if (param.type !== "Identifier" || param.name === "this" || param.optional || param.decorators?.length) {
    invalid(file, param, "Expected a required, named value parameter.");
  }
  return param;
}

function choose(file: string, node: Node, condition: Term, yes: Term, no: Term): Term {
  if (condition.sort !== "bool" || yes.sort !== no.sort) {
    invalid(file, node, "A conditional needs a boolean test and two branches of the same type.");
  }
  return { sort: yes.sort, code: `(if ${condition.code} then ${yes.code} else ${no.code})` };
}

function expressionCompiler(file: string, bindings: ReadonlyMap<string, Term>) {
  function apply(node: Node, op: string, input: Sort, output: Sort, ...args: Term[]): Term {
    if (args.some(a => a.sort !== input)) invalid(file, node, `${op} expects ${input === "Z" ? "bigint" : "boolean"} operands.`);
    return { sort: output, code: `(${op} ${args.map(a => a.code).join(" ")})` };
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
        return choose(file, node, expr(node.test), expr(node.consequent), expr(node.alternate));
    }
    return invalid(file, node, `Unsupported TypeScript: ${node.type}${"operator" in node ? ` (${node.operator})` : ""}.`);
  }

  return expr;
}

export function translate(file: string, name: string, reviewed?: ReviewedProperty): Model {
  const { source, program } = readSourceModule(file);
  const fn = selectSubject(program, file, name);
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Async, generator and generic functions are unsupported.");

  const bindings = new Map<string, Term>();
  const params = fn.params.map((param, i) => {
    const id = identifier(file, param);
    const term = { sort: sort(file, id.typeAnnotation, id), code: `p${i}` };
    bindings.set(id.name, term);
    return term;
  });
  const resultSort = sort(file, fn.returnType, fn);
  const expr = expressionCompiler(file, bindings);

  function branch(stmt: Statement): Term {
    return statements(stmt.type === "BlockStatement" ? stmt.body : [stmt], stmt);
  }
  function statements(stmts: Statement[], at: Node): Term {
    const [first, ...rest] = stmts;
    if (first?.type === "ReturnStatement" && first.argument && !rest.length) return expr(first.argument);
    if (first?.type === "IfStatement" && (!first.alternate || !rest.length)) {
      const yes = branch(first.consequent);
      const no = first.alternate ? branch(first.alternate) : statements(rest, first);
      return choose(file, first, expr(first.test), yes, no);
    }
    return invalid(file, first ?? at, "Expected a return on every path; only return and if/else statements are supported.");
  }

  const body = statements(fn.body.body, fn.body);
  if (body.sort !== resultSort) invalid(file, fn.body, "The returned type does not match the declared return type.");
  if (!reviewed) return { params, body };

  const { node } = reviewed;
  const inputs = [...params, { sort: resultSort, code: "result" }];
  if (node.params.length !== inputs.length) {
    invalid(reviewed.file, node, `The property must take the ${params.length} subject argument(s), followed by the result.`);
  }
  const propertyBindings = new Map<string, Term>();
  node.params.forEach((param, i) => {
    const id = identifier(reviewed.file, param);
    const input = inputs[i]!;
    if (id.typeAnnotation && sort(reviewed.file, id.typeAnnotation, id) !== input.sort) {
      invalid(reviewed.file, id, "The property's parameter type must match the subject signature.");
    }
    propertyBindings.set(id.name, input);
  });
  const property = expressionCompiler(reviewed.file, propertyBindings)(node.body);
  if (property.sort !== "bool" || (node.returnType && sort(reviewed.file, node.returnType, node) !== "bool")) {
    invalid(reviewed.file, node, "The property must return a boolean.");
  }

  // Replay the original expressions on the JS runtime, independently of Rocq's lowering.
  // Only closed, validated bodies are compiled; the enclosing module never executes.
  const run = new Function(...bindings.keys(), '"use strict";\n' + source.slice(fn.body.start! + 1, fn.body.end! - 1));
  const holds = new Function(...propertyBindings.keys(), `"use strict";\nreturn (\n${reviewed.expression}\n);`);
  return { params, body, property, replay: { run: (...args) => run(...args), holds: (...args) => holds(...args) } };
}

export function subjectModule({ params, body, property }: Model): string {
  const binders = params.map(p => `(${p.code} : ${p.sort})`);
  const args = params.map(p => p.code);
  const signature = [...params.map(p => p.sort), body.sort].join(" -> ");
  const forall = binders.length ? `forall ${binders.join(" ")}, ` : "";
  const application = ["impl", ...args].join(" ");
  const predicateHead = ["property", ...binders, `(result : ${body.sort})`].join(" ");
  const predicateCall = ["property", ...args, `(${application})`].join(" ");
  return [
    "From Stdlib Require Import ZArith Bool.",
    "",
    `Definition ${["impl", ...binders].join(" ")} : ${body.sort} := ${body.code}.`,
    "",
    ...(property ? [
      `Definition ${predicateHead} : bool := ${property.code}.`,
      "",
      "Definition claim : Prop :=",
      `  ${forall}${predicateCall} = true.`,
    ] : [
      `Definition agrees (spec : ${signature}) : Prop :=`,
      `  ${forall}${application} = ${["spec", ...args].join(" ")}.`,
    ]),
    "",
  ].join("\n");
}
