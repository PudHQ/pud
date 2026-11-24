import type { AssignmentExpression, Node, Statement } from "@babel/types";
import { selectSubject } from "@pud/model/module";
import { invalid, parseSourceModule } from "@pud/model/source";
import { leanTypes, nameOf, ofSort, readValue, tsSort, type Sort, type Value } from "./syntax.ts";

type Binding = Value & { mutable?: boolean };
export type Parameter = Value & { name: string };

export interface Subject {
  params: Parameter[];
  result: Sort;
  definition: string;
}

export function lowerSubject(file: string, symbol: string, source: string): Subject {
  const fn = selectSubject(parseSourceModule(file, source), file, symbol, { allowArrowFunctions: true });
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Expected a synchronous, non-generic function.");
  const result = tsSort(file, fn.returnType, fn);
  if (result === "integers") invalid(file, fn, "The prototype supports scalar return values.");
  const params = fn.params.map((node, i) => ({
    name: nameOf(file, node),
    sort: tsSort(file, node.type === "Identifier" ? node.typeAnnotation : undefined, node),
    code: `p${i}`,
  }));
  const scope = new Map<string, Binding>(params.map(p => [p.name, p]));
  const signature = params.map(p => `(${p.code} : ${leanTypes[p.sort]})`).join(" ");
  const header = `def impl ${signature} : ${leanTypes[result]} :=`;

  if (fn.body.type !== "BlockStatement") {
    const returned = ofSort(file, fn.body, readValue(file, fn.body, scope), result);
    return { params, result, definition: `${header}\n  ${returned}` };
  }

  let locals = 0;
  const lines: string[] = [];

  function assignment(node: AssignmentExpression, bindings: ReadonlyMap<string, Binding>) {
    const name = nameOf(file, node.left);
    const binding = bindings.get(name);
    if (!binding?.mutable || binding.sort === "integers") invalid(file, node.left, "Only scalar let bindings can be assigned.");
    const rhs = ofSort(file, node.right, readValue(file, node.right, bindings), binding.sort);
    if (node.operator === "=") return { name, binding, rhs };
    if (binding.sort === "integer" && (node.operator === "+=" || node.operator === "-=")) {
      return { name, binding, rhs: `(${binding.code} ${node.operator[0]} ${rhs})` };
    }
    return invalid(file, node, `Unsupported assignment '${node.operator}'.`);
  }

  function line(indent: number, code: string) { lines.push(" ".repeat(indent) + code); }

  function statement(node: Statement, bindings: Map<string, Binding>, indent: number): void {
    switch (node.type) {
      case "EmptyStatement": return;
      case "VariableDeclaration": {
        if (node.kind !== "const" && node.kind !== "let") invalid(file, node, "Expected a const or let declaration.");
        for (const decl of node.declarations) {
          const name = nameOf(file, decl.id);
          if (!decl.init || bindings.has(name)) invalid(file, decl, "Expected a new, initialized binding.");
          const value = readValue(file, decl.init, bindings);
          if (value.sort === "integers") invalid(file, decl, "Keep loop inputs as named parameters.");
          if (decl.id.type === "Identifier" && decl.id.typeAnnotation) {
            ofSort(file, decl, value, tsSort(file, decl.id.typeAnnotation, decl));
          }
          const code = `v${locals++}`, mutable = node.kind === "let";
          bindings.set(name, { sort: value.sort, code, mutable });
          line(indent, `let ${mutable ? "mut " : ""}${code} := ${value.code}`);
        }
        return;
      }
      case "ExpressionStatement": {
        if (node.expression.type !== "AssignmentExpression") invalid(file, node, "Expected a local assignment.");
        const { binding, rhs } = assignment(node.expression, bindings);
        line(indent, `${binding.code} := ${rhs}`);
        return;
      }
      case "IfStatement": {
        const test = ofSort(file, node.test, readValue(file, node.test, bindings), "boolean");
        line(indent, `if ${test} then`);
        branch(node.consequent, bindings, indent + 2);
        if (node.alternate) {
          line(indent, "else");
          branch(node.alternate, bindings, indent + 2);
        }
        return;
      }
      case "ForOfStatement": {
        const decl = node.left.type === "VariableDeclaration" && node.left.kind === "const" &&
          node.left.declarations.length === 1 ? node.left.declarations[0] : undefined;
        if (node.await || !decl || decl.init) invalid(file, node, "Expected a synchronous for (const item of values) loop.");
        const item = nameOf(file, decl.id), values = ofSort(file, node.right, readValue(file, node.right, bindings), "integers");
        if (bindings.has(item)) invalid(file, decl, "The loop item must have a new name.");
        const inner = node.body.type === "BlockStatement" && node.body.body.length === 1 ? node.body.body[0] : node.body;
        if (inner?.type !== "ExpressionStatement" || inner.expression.type !== "AssignmentExpression") {
          invalid(file, node.body, "A loop body must perform one scalar accumulator assignment.");
        }
        const target = nameOf(file, inner.expression.left), accumulator = bindings.get(target);
        if (!accumulator?.mutable || accumulator.sort !== "integer") invalid(file, inner, "Expected an existing bigint let accumulator.");
        const loopScope = new Map(bindings);
        const itemCode = `v${locals++}`, stateCode = `v${locals++}`;
        loopScope.set(item, { sort: "integer", code: itemCode });
        loopScope.set(target, { ...accumulator, code: stateCode });
        const { rhs } = assignment(inner.expression, loopScope);
        const step = `(fun (${stateCode} ${itemCode} : Int) => ${rhs})`;
        line(indent, `${accumulator.code} := List.foldl ${step} ${accumulator.code} ${values}`);
        return;
      }
      default: invalid(file, node, `Unsupported statement '${node.type}' before the final return.`);
    }
  }

  function branch(node: Statement, bindings: ReadonlyMap<string, Binding>, indent: number) {
    const inner = new Map(bindings);
    const statements = node.type === "BlockStatement" ? node.body : [node];
    for (const child of statements) statement(child, inner, indent);
    line(indent, "pure ()");
  }

  function finalReturn(node: Node | undefined) {
    if (node?.type !== "ReturnStatement" || !node.argument) invalid(file, node, "Expected a final return with a value.");
    return ofSort(file, node.argument, readValue(file, node.argument, scope), result);
  }

  const body = fn.body.body;
  for (const node of body.slice(0, -1)) statement(node, scope, 2);
  line(2, `return ${finalReturn(body.at(-1))}`);
  return { params, result, definition: `${header} Id.run do\n${lines.join("\n")}` };
}
