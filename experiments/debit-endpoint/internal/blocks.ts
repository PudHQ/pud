import type { Expr } from "../../../packages/pud/src/expressions.ts";
import { invalid, type BlockStatement, type Node, type Statement as TsStatement, type TryStatement } from "../../../packages/pud/src/source.ts";

export type Statement<Effect, Result> =
  | { kind: "if"; test: Expr; yes: Statement<Effect, Result>[]; no: Statement<Effect, Result>[] }
  | { kind: "return"; value: Result }
  | { kind: "effect"; effect: Effect };

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
        if (test.sort !== "boolean") invalid(frontend.file, node.test, "A conditional needs a boolean test.");
        body.push({ kind: "if", test, yes: block([node.consequent]), no: node.alternate ? block([node.alternate]) : [] });
        break;
      }
      case "ReturnStatement": body.push({ kind: "return", value: frontend.returned(node.argument, scope, node) }); break;
      case "TryStatement":
        if (!frontend.tryBody) invalid(frontend.file, node, "Unsupported TypeScript: TryStatement.");
        body.push(...block(frontend.tryBody(node, scope).body));
        break;
      default: body.push(...frontend.statement(node, scope));
    }
  }
  return body;
}
