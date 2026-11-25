/// <reference path="./lean-assets.d.ts" />
import type { BlockStatement, Node, Statement, VariableDeclarator } from "@babel/types";
import iterationModel from "./iteration.lean" with { type: "text" };
import scalarModel from "./scalar.lean" with { type: "text" };
import { errorKinds, type Sort } from "./syntax.ts";

export const scalarSemantics = scalarModel.replace(/^import Std\s*/, "").trimEnd();
export const iterationSemantics = iterationModel.replace(/^import Std\s*/, "").trimEnd();

type Kind = "integer" | "boolean";
type Scalar = { sort: Kind; code: string };
type Scope = ReadonlyMap<string, Scalar>;

interface ScalarFunction {
  code: string;
  result: Sort;
  sourceExpression?: string;
}

const integerOperators = { "+": "add", "-": "sub", "*": "mul",
  "<": "lt", "<=": "lte", ">": "gt", ">=": "gte" } as const;

export function scalarValue(sort: Sort, value: string): Scalar | undefined {
  return sort === "integer" || sort === "boolean" ? { sort, code: `(.${sort} ${value})` } : undefined;
}

export function scalarCall(subject: ScalarFunction, args: readonly (Scalar | undefined)[], fresh: () => string): Scalar | undefined {
  if (!subject.sourceExpression || args.some(arg => arg === undefined)) return;
  const sort = subject.result;
  if (sort !== "integer" && sort !== "boolean") return;
  const names = args.map(fresh);
  const call = `(${[subject.code + "Source", ...names].join(" ")})`;
  return { sort, code: args.reduceRight((body, arg, index) =>
    `(.bind ${arg!.code} (fun ${names[index]} => ${body}))`, call) };
}

class OutsideScalarSemantics extends Error {}
function outside(): never { throw new OutsideScalarSemantics(); }

/** Reify the frozen AST independently of the ordinary Lean expression printer. */
export function scalarSource(
  fn: Node, parameters: readonly { name: string; sort: Sort; code: string }[], result: Sort,
  callees: ReadonlyMap<string, ScalarFunction>,
): string | undefined {
  if (result !== "integer" && result !== "boolean") return;
  const scope = new Map<string, Scalar>();
  for (const param of parameters) {
    const value = scalarValue(param.sort, param.code);
    if (!value) return;
    scope.set(param.name, { sort: value.sort, code: param.code });
  }

  let next = 0;
  const fresh = () => `_js${next++}`;
  const unary = (op: string, value: Scalar, sort: Kind): Scalar => ({ sort, code: `(.unary .${op} ${value.code})` });
  const conditional = (test: Scalar, yes: string, no: string) =>
    `(.choose ${test.sort === "integer" ? unary("truthy", test, "boolean").code : test.code} ${yes} ${no})`;
  const extend = (env: Scope, name: string, value: Scalar): Scope => new Map([...env, [name, value]]);

  function expression(node: Node, env: Scope): Scalar {
    switch (node.type) {
      case "Identifier": {
        const value = env.get(node.name) ?? outside();
        return scalarValue(value.sort, value.code)!;
      }
      case "BigIntLiteral": return scalarValue("integer", `(${BigInt(node.value)} : Int)`)!;
      case "BooleanLiteral": return scalarValue("boolean", String(node.value))!;
      case "UnaryExpression": {
        const arg = expression(node.argument, env);
        if (node.operator === "-") return unary("neg", arg, "integer");
        if (node.operator === "!") return unary("not", arg, "boolean");
        return outside();
      }
      case "LogicalExpression": {
        if (node.operator !== "&&" && node.operator !== "||") return outside();
        const lhs = expression(node.left, env), rhs = expression(node.right, env);
        return { sort: "boolean", code: `(.${node.operator === "&&" ? "and" : "or"} ${lhs.code} ${rhs.code})` };
      }
      case "ConditionalExpression": {
        const yes = expression(node.consequent, env), no = expression(node.alternate, env);
        return { sort: yes.sort, code: conditional(expression(node.test, env), yes.code, no.code) };
      }
      case "BinaryExpression": {
        const lhs = expression(node.left, env), op = node.operator;
        if (op === "<<") {
          if (node.right.type !== "BigIntLiteral") return outside();
          return { sort: "integer", code: `(.unary (.shift ${BigInt(node.right.value)}) ${lhs.code})` };
        }
        if (op === "&") {
          if (node.right.type !== "BigIntLiteral") return outside();
          const mask = BigInt(node.right.value);
          if ((mask & (mask + 1n)) !== 0n) return outside();
          const bits = mask === 0n ? 0 : mask.toString(2).length;
          return { sort: "integer", code: `(.unary (.mask ${bits}) ${lhs.code})` };
        }
        const rhs = expression(node.right, env);
        if (op === "/" || op === "%") {
          const operator = op === "/" ? "divide" : "remainder";
          return { sort: "integer", code: `(.binary (.${operator} .rangeError) ${lhs.code} ${rhs.code})` };
        }
        if (op === "===" || op === "!==") {
          const equality = lhs.sort === "integer" ? "equalInt" : "equalBool";
          const equal: Scalar = { sort: "boolean", code: `(.binary .${equality} ${lhs.code} ${rhs.code})` };
          return op === "===" ? equal : unary("not", equal, "boolean");
        }
        if (!Object.hasOwn(integerOperators, op)) return outside();
        const operator = integerOperators[op as keyof typeof integerOperators];
        const sort = op === "+" || op === "-" || op === "*" ? "integer" : "boolean";
        return { sort, code: `(.binary .${operator} ${lhs.code} ${rhs.code})` };
      }
      case "CallExpression": {
        if (node.callee.type !== "Identifier") return outside();
        const callee = callees.get(node.callee.name) ?? outside();
        return scalarCall(callee, node.arguments.map(arg => expression(arg, env)), fresh) ?? outside();
      }
      default: return outside();
    }
  }

  const type = (value: Scalar) => value.sort === "integer" ? "Int" : "Bool";

  function bind(name: string, value: Scalar, env: Scope, resume: (scope: Scope) => string): string {
    const local = fresh();
    return `(.bind ${value.code} (fun ${local} => ${resume(extend(env, name, { sort: value.sort, code: local }))}))`;
  }

  function declarations(nodes: readonly VariableDeclarator[], env: Scope, resume: (scope: Scope) => string): string {
    const [node, ...rest] = nodes;
    if (!node) return resume(env);
    if (node.id.type !== "Identifier" || !node.init) return outside();
    return bind(node.id.name, expression(node.init, env), env, scope => declarations(rest, scope, resume));
  }

  function statements(nodes: readonly Statement[], env: Scope, resume: (scope: Scope) => string): string {
    const [node, ...rest] = nodes;
    if (!node) return resume(env);
    const continueWith = (scope: Scope) => statements(rest, scope, resume);
    switch (node.type) {
      case "ReturnStatement": return node.argument ? expression(node.argument, env).code : outside();
      case "EmptyStatement": return continueWith(env);
      case "VariableDeclaration": return declarations(node.declarations, env, continueWith);
      case "ExpressionStatement": {
        const assignment = node.expression;
        if (assignment.type !== "AssignmentExpression" || assignment.left.type !== "Identifier") return outside();
        const name = assignment.left.name;
        const rhs = expression(assignment.right, env);
        if (assignment.operator === "=") return bind(name, rhs, env, continueWith);
        if (assignment.operator !== "+=" && assignment.operator !== "-=") return outside();
        const lhs = expression(assignment.left, env);
        const op = assignment.operator === "+=" ? "add" : "sub";
        return bind(name, { sort: "integer", code: `(.binary .${op} ${lhs.code} ${rhs.code})` }, env, continueWith);
      }
      case "ThrowStatement": {
        const thrown = node.argument;
        if (thrown.type !== "NewExpression" || thrown.callee.type !== "Identifier" || !Object.hasOwn(errorKinds, thrown.callee.name)) return outside();
        return `(.thrown .${errorKinds[thrown.callee.name as keyof typeof errorKinds]})`;
      }
      case "IfStatement": {
        // Share the continuation so consecutive if statements don't duplicate the source witness.
        const captured = [...env].map(([name, value]) => [name, { sort: value.sort, code: fresh() }] as const);
        const continuation = fresh();
        let used = false;
        const resumeBranch = (scope: Scope) => {
          used = true;
          return `(${[continuation, ...captured.map(([name]) => scope.get(name)!.code)].join(" ")})`;
        };
        const yes = statements(branch(node.consequent), env, resumeBranch);
        const no = statements(branch(node.alternate), env, resumeBranch);
        const choice = conditional(expression(node.test, env), yes, no);
        if (!used) return choice;
        const args = captured.map(([, value]) => `(${value.code} : ${type(value)})`);
        const tail = continueWith(new Map(captured));
        return `(let ${continuation}${args.length ? " " + args.join(" ") : ""} := ${tail}; ${choice})`;
      }
      case "TryStatement": {
        const [attempt] = node.block.body;
        if (node.block.body.length !== 1 || attempt?.type !== "ReturnStatement" || !attempt.argument ||
            !node.handler || node.handler.param || node.finalizer) return outside();
        const recover = statements(node.handler.body.body, env, next => continueWith(new Map([...env].map(([name]) => [name, next.get(name)!]))));
        return `(.handle ${expression(attempt.argument, env).code} ${recover})`;
      }
      default: return outside();
    }
  }

  function branch(node: Statement | null | undefined): BlockStatement["body"] {
    return node?.type === "BlockStatement" ? node.body : node ? [node] : [];
  }

  try {
    if (fn.type === "BlockStatement") return statements(fn.body, scope, outside);
    return expression(fn, scope).code;
  } catch (error) {
    if (!(error instanceof OutsideScalarSemantics)) throw error;
  }
}
