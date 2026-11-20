import { parse } from "@babel/parser";
import type { Node, Statement } from "@babel/types";
import { checkSchema, lowerSql, type SqlOperation, type SqlParameter } from "./sql.ts";

type Value =
  | { kind: "db" | "auth" | "input" | "undefined" | "null" }
  | { kind: "text" | "bigint" | "number" | "bool" | "decimal" | "query" | "rows"; code: string; literal?: string };

type Scope = Map<string, Value>;

function unsupported(node: Node, detail: string): never {
  throw new Error(`line ${node.loc?.start.line ?? "?"}: ${detail}`);
}

function field(node: Node, object: Value, name: string): Value {
  if (object.kind === "auth" && name === "tenantId") return { kind: "text", code: "q.tenant" };
  if (object.kind === "input") {
    if (name === "accountId") return { kind: "text", code: "q.account" };
    if (name === "requestId") return { kind: "text", code: "q.requestId" };
    if (name === "amountCents") return { kind: "bigint", code: "q.amount" };
  }
  if (object.kind === "query" && name === "rows") return { kind: "rows", code: object.code };
  if (object.kind === "rows" && name === "length") return { kind: "number", code: object.code };
  return unsupported(node, `Unsupported property '${name}' on ${object.kind}`);
}

// Only the data visible at the HTTP/SQL boundary enter the transaction model.
// Keep primitive expressions in TypeScript. LemmaScript translates their semantics.
function value(node: Node, env: Scope): Value {
  switch (node.type) {
    case "Identifier": {
      const found = env.get(node.name);
      if (found) return found;
      if (node.name === "undefined") return { kind: "undefined" };
      return unsupported(node, `Unknown binding '${node.name}'`);
    }
    case "TemplateLiteral":
      if (node.expressions.length === 0 && typeof node.quasis[0]?.value.cooked === "string") {
        const literal = node.quasis[0].value.cooked;
        return { kind: "text", code: JSON.stringify(literal), literal };
      }
      break;
    case "StringLiteral": return { kind: "text", code: JSON.stringify(node.value), literal: node.value };
    case "NullLiteral": return { kind: "null" };
    case "BooleanLiteral": return { kind: "bool", code: String(node.value) };
    case "BigIntLiteral": return { kind: "bigint", code: `${node.value}n` };
    case "NumericLiteral":
      if (Number.isSafeInteger(node.value)) return { kind: "number", code: String(node.value) };
      break;
    case "MemberExpression":
      if (!node.computed && node.property.type === "Identifier") return field(node, value(node.object, env), node.property.name);
      break;
    case "CallExpression": {
      const callee = node.callee;
      if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier"
          && callee.property.name === "toString" && node.arguments.length === 0) {
        const receiver = value(callee.object, env);
        if (receiver.kind === "bigint" && receiver.code === "q.amount") return { kind: "decimal", code: receiver.code };
      }
      break;
    }
    case "TSAsExpression":
    case "TSNonNullExpression":
    case "TSSatisfiesExpression": return value(node.expression, env);
    case "UnaryExpression": {
      const operand = value(node.argument, env);
      if (node.operator === "!") return { kind: "bool", code: `!(${truth(node, operand)})` };
      if (node.operator === "-" && (operand.kind === "number" || operand.kind === "bigint")) {
        return { kind: operand.kind, code: `(-${operand.code})` };
      }
      if (node.operator === "typeof") {
        const names = { text: "string", decimal: "string", bool: "boolean", null: "object", bigint: "bigint", number: "number", undefined: "undefined" } as const;
        if (Object.hasOwn(names, operand.kind)) {
          const literal = names[operand.kind as keyof typeof names];
          return { kind: "text", code: JSON.stringify(literal), literal };
        }
      }
      break;
    }
    case "LogicalExpression": {
      const left = value(node.left, env), right = value(node.right, env);
      if (["&&", "||"].includes(node.operator) && left.kind === "bool" && right.kind === "bool") {
        return { kind: "bool", code: `(${left.code} ${node.operator} ${right.code})` };
      }
      break;
    }
    case "BinaryExpression": {
      const left = value(node.left, env), right = value(node.right, env);
      if (left.kind !== right.kind || !("code" in left) || !("code" in right)) break;
      const numeric = left.kind === "number" || left.kind === "bigint";
      if ((numeric && ["<", "<=", ">", ">="].includes(node.operator)) ||
          ((numeric || left.kind === "bool" || left.kind === "text") && ["===", "!=="].includes(node.operator))) {
        return { kind: "bool", code: `(${left.code} ${node.operator} ${right.code})` };
      }
      break;
    }
  }
  return unsupported(node, `Unsupported transaction expression '${node.type}'`);
}

function truth(node: Node, v: Value): string {
  if (v.kind === "bool") return v.code;
  if (v.kind === "number" || v.kind === "bigint") return `(${v.code} !== ${v.kind === "bigint" ? "0n" : "0"})`;
  return unsupported(node, `Unsupported condition of type ${v.kind}`);
}

function bind(node: Node, env: Scope, v: Value): void {
  if (node.type === "Identifier") {
    if (env.has(node.name) || ["undefined", "RangeError", "Error"].includes(node.name)) {
      unsupported(node, `Shadowed binding '${node.name}' is unsupported`);
    }
    env.set(node.name, v);
    return;
  }
  if (node.type === "ObjectPattern") {
    for (const p of node.properties) {
      if (p.type !== "ObjectProperty" || p.computed || p.key.type !== "Identifier") unsupported(p, "Unsupported destructuring");
      bind(p.value, env, field(p, v, p.key.name));
    }
    return;
  }
  unsupported(node, "Expected a name or object destructuring");
}

export interface Transaction {
  source: string;
  sql: string;
  operations: string[];
}

export function lower(source: string, schema: string): Transaction {
  checkSchema(schema);
  const module = parse(source, { sourceType: "module", plugins: ["typescript"] }).program;
  const env: Scope = new Map();
  let entry;
  for (const stmt of module.body) {
    if (stmt.type === "ImportDeclaration" && stmt.importKind === "type") continue;
    const decl = stmt.type === "ExportNamedDeclaration" ? stmt.declaration : stmt;
    if (decl?.type === "TSInterfaceDeclaration" || decl?.type === "TSTypeAliasDeclaration") continue;
    if (stmt.type === "ExportNamedDeclaration" && decl?.type === "FunctionDeclaration" && decl.id?.name === "debit") {
      entry = decl;
      continue;
    }
    if (decl?.type === "VariableDeclaration" && decl.kind === "const" && !decl.declare) {
      for (const d of decl.declarations) {
        if (d.id.type !== "Identifier" || !d.init) unsupported(d, "Expected a constant initializer");
        bind(d.id, env, value(d.init, env));
      }
      continue;
    }
    unsupported(stmt, "Unsupported runtime declaration in the transaction module");
  }
  if (!entry?.body || !entry.async || entry.generator || entry.params.length !== 3) {
    throw new Error("Expected an exported async debit(session, auth, input) handler");
  }
  for (const [i, role] of (["db", "auth", "input"] as const).entries()) bind(entry.params[i]!, env, { kind: role });

  const definitions: string[] = [], operations: string[] = [];
  let nextQuery = 0;

  // SQL operations return a fresh state and a row count. Transaction boundaries
  // choose whether that pending state is published or discarded.
  function readQuery(node: Node, scope: Scope, id: number): SqlOperation {
    if (node.type !== "AwaitExpression" || node.argument.type !== "CallExpression") unsupported(node, "Expected an awaited session query");
    const call = node.argument, target = call.callee;
    if (target.type !== "MemberExpression" || target.computed || target.property.type !== "Identifier" ||
        target.property.name !== "query" || value(target.object, scope).kind !== "db") unsupported(node, "Unsupported awaited operation");
    const [command, args] = call.arguments;
    if (!command || call.arguments.length > 2 || (args && args.type !== "ArrayExpression")) unsupported(node, "Expected static SQL and a parameter array");
    const sql = value(command, scope);
    if (sql.kind !== "text" || sql.literal === undefined) unsupported(command, "Expected static SQL text");
    const params: SqlParameter[] = (args?.elements ?? []).map(arg => {
      if (!arg) return unsupported(node, "Missing SQL parameter");
      const v = value(arg, scope);
      if (v.kind === "decimal") return { term: v.code, sort: "int" };
      if (v.kind === "text" && v.literal === undefined) return { term: v.code, sort: "text" };
      return unsupported(arg, "Unsupported SQL parameter expression");
    });
    try { return lowerSql(sql.literal, params, id); }
    catch (e) { return unsupported(node, (e as Error).message); }
  }

  function query(node: Node, scope: Scope, code: string[]): Value {
    const id = nextQuery++;
    const op = readQuery(node, scope, id);
    if (op.kind === "write") {
      const name = `pudQuery${id}`, result = `pudRows${id}`;
      operations.push(name);
      if (op.definition) definitions.push(op.definition);
      definitions.push(`function ${name}(working: State, q: Request): QueryResult { ${op.expression} }`);
      code.push("valid = valid && active;", `const ${result} = ${name}(working, q);`, `working = ${result}.after;`);
      return { kind: "query", code: `${result}.rowCount` };
    }
    if (op.kind === "begin") code.push("valid = valid && !started;", "started = true;", "active = true;", "working = committed;");
    else {
      code.push("valid = valid && active;", "active = false;", op.kind === "commit" ? "committed = working;" : "working = committed;");
    }
    return { kind: "query", code: "0" };
  }

  function returned(node: Node | null | undefined, scope: Scope): string {
    if (node?.type === "ConditionalExpression") {
      return `(${truth(node.test, value(node.test, scope))} ? ${returned(node.consequent, scope)} : ${returned(node.alternate, scope)})`;
    }
    const v = node && value(node, scope);
    // The contracts can distinguish three string results. All non-string
    // primitives compare unequal to them under JS strict equality.
    if (v?.kind === "text") return v.code;
    if (!v || ["bool", "number", "null", "undefined", "decimal"].includes(v.kind)) return '"<other>"';
    return unsupported(node!, "Unsupported HTTP return value");
  }

  function block(stmts: Statement[], parent: Scope): string[] {
    const scope = new Map(parent), code: string[] = [];
    for (const s of stmts) {
      switch (s.type) {
        case "VariableDeclaration":
          if (s.kind !== "const") unsupported(s, "Only immutable handler bindings are supported");
          for (const d of s.declarations) {
            if (!d.init) unsupported(d, "Expected an initializer");
            bind(d.id, scope, d.init.type === "AwaitExpression" ? query(d.init, scope, code) : value(d.init, scope));
          }
          break;
        case "ExpressionStatement": query(s.expression, scope, code); break;
        case "BlockStatement": code.push(...block(s.body, scope)); break;
        case "IfStatement":
          code.push(`if (${truth(s.test, value(s.test, scope))}) {`, ...block([s.consequent], scope), "}");
          if (s.alternate) code.push("else {", ...block([s.alternate], scope), "}");
          break;
        case "TryStatement": {
          // Business outcomes cover successful database operations. An error
          // handler may clean up and rethrow, but may not turn an error into a return.
          const c = s.handler, body = c?.body.body;
          const last = body?.at(-1);
          if (s.finalizer || !body || !c || c.param?.type !== "Identifier" || last?.type !== "ThrowStatement" ||
              last.argument?.type !== "Identifier" || last.argument.name !== c.param.name || body.length > 2) {
            unsupported(s, "The transaction catch must propagate database errors");
          }
          if (body.length === 2) {
            const first = body[0]!;
            if (first.type !== "ExpressionStatement" || scope.has(c.param.name)) unsupported(first, "Unsupported transaction cleanup");
            if (readQuery(first.expression, scope, nextQuery).kind !== "rollback") unsupported(first, "Expected ROLLBACK before rethrow");
          }
          code.push(...block(s.block.body, scope));
          break;
        }
        case "ThrowStatement":
          if (s.argument?.type !== "NewExpression" || s.argument.callee.type !== "Identifier" ||
              !["RangeError", "Error"].includes(s.argument.callee.name) || !s.argument.arguments.every(a => a.type === "StringLiteral")) {
            unsupported(s, "Unsupported throw expression");
          }
          code.push('return {status: "<threw>", after: committed, closed: false};');
          break;
        case "ReturnStatement": code.push(`return {status: ${returned(s.argument, scope)}, after: committed, closed: valid && !active};`); break;
        case "EmptyStatement": break;
        default: unsupported(s, `Unsupported transaction statement '${s.type}'`);
      }
    }
    return code;
  }

  const body = block(entry.body.body, env);
  const projection = [
    "interface State { opaqueId: bigint }",
    "interface Request { tenant: string; account: string; requestId: string; amount: bigint }",
    "interface QueryResult { after: State; rowCount: number }",
    "interface Outcome { status: string; after: State; closed: boolean }",
    ...operations.map(name => `//@ extern\nfunction ${name}(working: State, q: Request): QueryResult { throw new Error(); }`),
    "export function pudTransaction(s: State, q: Request): Outcome {",
    "let committed = s; let working = s; let active = false; let started = false; let valid = true;",
    ...body,
    'return {status: "<other>", after: committed, closed: valid && !active};',
    "}",
  ];
  return { source: projection.join("\n"), sql: definitions.join("\n"), operations };
}
