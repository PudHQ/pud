import { binary, bool, choose, integer, ref, string, unary, type Expr } from "../../../packages/pud/src/expressions.ts";
import { selectSubject } from "../../../packages/pud/src/module.ts";
import { invalid, parseSourceModule, type Node } from "../../../packages/pud/src/source.ts";
import { readBlock, type Statement } from "./blocks.ts";
import { checkSchema, lowerSql, type SqlOperation, type SqlParameter } from "./sql.ts";

type Value =
  | { kind: "db" | "auth" | "input" | "undefined" | "null" }
  | { kind: "text" | "bigint" | "number" | "bool" | "decimal" | "query" | "rows"; term: Expr };
type Scope = Map<string, Value>;
export interface Query { slot: number; operation: SqlOperation }
export interface Returned { status: Expr; isText: Expr; threw: boolean }
type Body = Statement<Query, Returned>[];
export interface Transaction { body: Body; queries: string[] }

const amount = ref("integer", "q", "amount");
const other = { status: string(""), isText: bool(false), threw: false };
const typeNames = { text: "string", decimal: "string", bool: "boolean", null: "object", bigint: "bigint", number: "number", undefined: "undefined" } as const;

/** Bind the ledger request and session to a transaction model. */
export function lower(source: string, schema: string, subject = "debit", file = "handler.ts"): Transaction {
  checkSchema(schema);
  const program = parseSourceModule(file, source);
  const entry = selectSubject(program, file, subject);
  function fail(node: Node, reason: string): never {
    return invalid(file, node, reason);
  }

  function field(node: Node, object: Value, name: string): Value {
    if (object.kind === "auth" && name === "tenantId") return { kind: "text", term: ref("string", "q", "tenant") };
    if (object.kind === "input") {
      if (name === "accountId") return { kind: "text", term: ref("string", "q", "account") };
      if (name === "requestId") return { kind: "text", term: ref("string", "q", "requestId") };
      if (name === "amountCents") return { kind: "bigint", term: amount };
    }
    if (object.kind === "query" && name === "rows") return { kind: "rows", term: object.term };
    if (object.kind === "rows" && name === "length") return { kind: "number", term: object.term };
    return fail(node, `Unsupported property '${name}' on ${object.kind}`);
  }

  function truth(node: Node, v: Value): Expr {
    if (v.kind === "bool") return v.term;
    if (v.kind === "number" || v.kind === "bigint") return binary("!==", v.term, integer(0n));
    return fail(node, `Unsupported condition of type ${v.kind}`);
  }

  function value(node: Node, env: Scope): Value {
    switch (node.type) {
      case "Identifier": return env.get(node.name) ?? (node.name === "undefined" ? { kind: "undefined" } : fail(node, `Unknown binding '${node.name}'`));
      case "TemplateLiteral":
        if (!node.expressions.length && typeof node.quasis[0]?.value.cooked === "string") return { kind: "text", term: string(node.quasis[0].value.cooked) };
        break;
      case "StringLiteral": return { kind: "text", term: string(node.value) };
      case "NullLiteral": return { kind: "null" };
      case "BooleanLiteral": return { kind: "bool", term: bool(node.value) };
      case "BigIntLiteral": return { kind: "bigint", term: integer(BigInt(node.value)) };
      case "NumericLiteral":
        if (Number.isSafeInteger(node.value)) return { kind: "number", term: integer(BigInt(node.value)) };
        break;
      case "MemberExpression":
        if (!node.computed && node.property.type === "Identifier") return field(node, value(node.object, env), node.property.name);
        break;
      case "CallExpression": {
        const target = node.callee;
        if (target.type === "MemberExpression" && !target.computed && target.property.type === "Identifier" &&
            target.property.name === "toString" && !node.arguments.length) {
          const receiver = value(target.object, env);
          if (receiver.kind === "bigint" && receiver.term === amount) return { kind: "decimal", term: amount };
        }
        break;
      }
      case "TSAsExpression":
      case "TSNonNullExpression":
      case "TSSatisfiesExpression": return value(node.expression, env);
      case "UnaryExpression": {
        const v = value(node.argument, env);
        if (node.operator === "!") return { kind: "bool", term: unary("!", truth(node, v)) };
        if (node.operator === "-" && (v.kind === "number" || v.kind === "bigint")) return { kind: v.kind, term: unary("-", v.term) };
        if (node.operator === "typeof" && Object.hasOwn(typeNames, v.kind)) return { kind: "text", term: string(typeNames[v.kind as keyof typeof typeNames]) };
        break;
      }
      case "LogicalExpression":
      case "BinaryExpression": {
        const op = node.operator, l = value(node.left, env), r = value(node.right, env);
        if (l.kind !== r.kind || !("term" in l) || !("term" in r)) break;
        const numeric = l.kind === "number" || l.kind === "bigint";
        if ((numeric && (op === "<" || op === "<=" || op === ">" || op === ">=")) ||
            ((numeric || l.kind === "bool" || l.kind === "text") && (op === "===" || op === "!==")) ||
            (l.kind === "bool" && (op === "&&" || op === "||"))) return { kind: "bool", term: binary(op, l.term, r.term) };
        if (l.kind === "bigint" && (op === "+" || op === "-" || op === "*")) return { kind: "bigint", term: binary(op, l.term, r.term) };
        break;
      }
    }
    return fail(node, `Unsupported transaction expression '${node.type}'`);
  }

  function bind(node: Node, env: Scope, v: Value): void {
    if (node.type === "Identifier") {
      if (env.has(node.name) || ["undefined", "RangeError", "Error"].includes(node.name)) fail(node, `Unsupported shadowed binding '${node.name}'`);
      env.set(node.name, v);
    } else if (node.type === "ObjectPattern") {
      for (const p of node.properties) {
        if (p.type !== "ObjectProperty" || p.computed || p.key.type !== "Identifier") fail(p, "Unsupported destructuring");
        bind(p.value, env, field(p, v, p.key.name));
      }
    } else fail(node, "Expected a name or object destructuring");
  }

  const env: Scope = new Map();
  const queries = new Set<string>();
  for (const stmt of program.body) {
    const decl = stmt.type === "ExportNamedDeclaration" ? stmt.declaration : stmt;
    if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations) {
        if (!d.init) return fail(d, "Expected a constant initializer");
        bind(d.id, env, value(d.init, env));
      }
    }
  }
  if (!entry.async || entry.generator || entry.typeParameters || entry.params.length !== 3) return fail(entry, "Expected an async (session, auth, input) ledger handler.");
  for (const [i, role] of (["db", "auth", "input"] as const).entries()) bind(entry.params[i]!, env, { kind: role });

  function readQuery(node: Node, scope: Scope): SqlOperation {
    if (node.type !== "AwaitExpression" || node.argument.type !== "CallExpression") return fail(node, "Expected an awaited session query");
    const call = node.argument, target = call.callee;
    if (target.type !== "MemberExpression" || target.computed || target.property.type !== "Identifier" ||
        target.property.name !== "query" || value(target.object, scope).kind !== "db") return fail(node, "Unsupported awaited operation");
    const [command, args] = call.arguments;
    if (!command || call.arguments.length > 2 || (args && args.type !== "ArrayExpression")) return fail(node, "Expected static SQL and a parameter array");
    const sql = value(command, scope);
    if (sql.kind !== "text" || sql.term.kind !== "string") return fail(command, "Expected static SQL text");
    const params = (args?.elements ?? []).map((arg): SqlParameter => {
      if (!arg) return fail(node, "Missing SQL parameter");
      const v = value(arg, scope);
      if (v.kind === "decimal") return { term: v.term, sort: "int" };
      if (v.kind === "text" && v.term.kind !== "string") return { term: v.term, sort: "text" };
      return fail(arg, "Unsupported SQL parameter expression");
    });
    try {
      const op = lowerSql(sql.term.value, params);
      if (op.kind === "insert" || op.kind === "update") queries.add(sql.term.value);
      return op;
    }
    catch (e) { return fail(node, (e as Error).message); }
  }

  function returned(node: Node | null | undefined, scope: Scope): Returned {
    if (node?.type === "ConditionalExpression") {
      const test = truth(node.test, value(node.test, scope));
      const yes = returned(node.consequent, scope), no = returned(node.alternate, scope);
      return { status: choose(test, yes.status, no.status), isText: choose(test, yes.isText, no.isText), threw: false };
    }
    if (!node) return other;
    const v = value(node, scope);
    if (v.kind === "text") return { status: v.term, isText: bool(true), threw: false };
    if (["bool", "number", "bigint", "undefined", "null"].includes(v.kind)) return other;
    return fail(node, "Unsupported HTTP return value");
  }

  let nextSlot = 0;
  const body = readBlock<Value, Query, Returned>(entry.body.body, env, {
    file, returned, condition: (node, scope) => truth(node, value(node, scope)),
    tryBody(node, scope) {
      const c = node.handler, body = c?.body.body, last = body?.at(-1);
      if (node.finalizer || !body || !c || c.param?.type !== "Identifier" || last?.type !== "ThrowStatement" ||
          last.argument?.type !== "Identifier" || last.argument.name !== c.param.name || body.length > 2) return fail(node, "The transaction catch must propagate database errors");
      if (body.length === 2) {
        const first = body[0]!;
        if (first.type !== "ExpressionStatement" || scope.has(c.param.name) || readQuery(first.expression, scope).kind !== "rollback") return fail(first, "Expected ROLLBACK before rethrow");
      }
      return node.block;
    },
    statement(node, scope) {
      const steps: Body = [];
      function query(n: Node): Value {
        const operation = readQuery(n, scope), slot = nextSlot++;
        steps.push({ kind: "effect", effect: { slot, operation } });
        const term = operation.kind === "insert" || operation.kind === "update" ? ref("integer", `rows${slot}`, "rowCount") : integer(0n);
        return { kind: "query", term };
      }
      if (node.type === "VariableDeclaration" && node.kind === "const") {
        for (const d of node.declarations) {
          if (!d.init) return fail(d, "Expected an initializer");
          bind(d.id, scope, d.init.type === "AwaitExpression" ? query(d.init) : value(d.init, scope));
        }
      } else if (node.type === "ExpressionStatement") query(node.expression);
      else if (node.type === "ThrowStatement" && node.argument?.type === "NewExpression" && node.argument.callee.type === "Identifier" &&
          ["RangeError", "Error"].includes(node.argument.callee.name) && node.argument.arguments.every(a => a.type === "StringLiteral")) {
        steps.push({ kind: "return", value: { ...other, threw: true } });
      } else return fail(node, `Unsupported transaction statement '${node.type}'`);
      return steps;
    },
  });
  return { body, queries: [...queries] };
}
