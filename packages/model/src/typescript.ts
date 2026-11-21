import type { BlockStatement, Node, Statement as TsStatement, TryStatement } from "@babel/types";
import { Unsupported } from "./adapter.ts";
import { binary, bool, choose, integer, unary, type BinaryOp, type Expr, type Statement } from "./model.ts";

export { Unsupported };

export function unsupported(file: string, node: Node | undefined, message: string): never {
  const at = node?.loc?.start;
  throw new Unsupported(`${file}${at ? `:${at.line}:${at.column + 1}` : ""}: ${message}`);
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
    return unsupported(file, node, (error as Error).message);
  }
  return unsupported(file, node, `Unsupported TypeScript: ${node.type}${"operator" in node ? ` (${node.operator})` : ""}.`);
}

type Scope<V> = Map<string, V>;
interface Frontend<V, E, R> {
  file: string;
  condition(node: Node, scope: Scope<V>): Expr;
  returned(node: Node | null | undefined, scope: Scope<V>, at: Node): R;
  statement(node: TsStatement, scope: Scope<V>): Statement<E, R>[];
  /** An effect model may admit cleanup which rethrows errors outside its successful-call contract. */
  tryBody?(node: TryStatement, scope: Scope<V>): BlockStatement;
}

export function readBlock<V, E, R>(statements: TsStatement[], parent: Scope<V>, frontend: Frontend<V, E, R>): Statement<E, R>[] {
  const scope = new Map(parent);
  const body: Statement<E, R>[] = [];
  const block = (inner: TsStatement[]) => readBlock(inner, scope, frontend);
  for (const node of statements) {
    switch (node.type) {
      case "EmptyStatement": break;
      case "BlockStatement": body.push(...block(node.body)); break;
      case "IfStatement": {
        const test = frontend.condition(node.test, scope);
        if (test.sort !== "boolean") unsupported(frontend.file, node.test, "A conditional needs a boolean test.");
        body.push({ kind: "if", test, yes: block([node.consequent]), no: node.alternate ? block([node.alternate]) : [] });
        break;
      }
      case "ReturnStatement": body.push({ kind: "return", value: frontend.returned(node.argument, scope, node) }); break;
      case "TryStatement":
        if (!frontend.tryBody) unsupported(frontend.file, node, "Unsupported TypeScript: TryStatement.");
        body.push(...block(frontend.tryBody(node, scope).body));
        break;
      default: body.push(...frontend.statement(node, scope));
    }
  }
  return body;
}
