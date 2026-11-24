import { getOuterBindingIdentifiers, type AssignmentExpression, type Node, type Statement } from "@babel/types";
import { selectSubject } from "@pud/model/module";
import { invalid, parseSourceModule } from "@pud/model/source";
import { isScalar, leanTypes, nameOf, ofSort, readValue, tsSort, type Sort, type Value } from "./syntax.ts";

type Binding = Value & { mutable?: boolean };
export type Parameter = Value & { name: string };

export interface Subject {
  params: Parameter[];
  result: Sort;
  itemType?: string;
  definition: string;
}

export function lowerSubject(file: string, symbol: string, source: string): Subject {
  const program = parseSourceModule(file, source);
  const fn = selectSubject(program, file, symbol, { allowArrowFunctions: true });
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Expected a synchronous, non-generic function.");
  const interfaces = new Set(program.body.flatMap(statement => {
    const node = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    return node?.type === "TSInterfaceDeclaration" && !node.typeParameters ? [node.id.name] : [];
  }));
  let itemType: string | undefined;
  function sort(annotation: Node | null | undefined, at: Node) {
    return tsSort(file, annotation, at, (name, node) => {
      if (!interfaces.has(name) || (itemType && itemType !== name)) {
        invalid(file, node, "Use one locally declared interface as the opaque array element type.");
      }
      itemType = name;
    });
  }
  const result = sort(fn.returnType, fn);
  if (result === "textOrItems") invalid(file, fn, "Return a scalar or a supported readonly array.");
  const params = fn.params.map((node, i) => ({
    name: nameOf(file, node),
    sort: sort(node.type === "Identifier" ? node.typeAnnotation : undefined, node),
    code: `p${i}`,
  }));
  const scope = new Map<string, Binding>(params.map(p => [p.name, p]));
  const signature = [itemType && "{Item : Type}", ...params.map(p => `(${p.code} : ${leanTypes[p.sort]})`)].filter(Boolean);
  const header = `def ${["impl", ...signature].join(" ")} : ${leanTypes[result]} :=`;

  function returned(node: Node, bindings: ReadonlyMap<string, Binding>) {
    if (node.type === "ArrayExpression" && !node.elements.length && !isScalar(result)) return "[]";
    return ofSort(file, node, readValue(file, node, bindings), result);
  }

  if (fn.body.type !== "BlockStatement") {
    return { params, result, itemType, definition: `${header}\n  ${returned(fn.body, scope)}` };
  }

  let locals = 0;
  const lines: string[] = [];
  let arrayGuard: Node | undefined;
  let shadowsArray = scope.has("Array") || program.body.some(statement => Object.hasOwn(getOuterBindingIdentifiers(statement), "Array"));

  function assignment(node: AssignmentExpression, bindings: ReadonlyMap<string, Binding>) {
    const name = nameOf(file, node.left);
    const binding = bindings.get(name);
    if (!binding?.mutable || !isScalar(binding.sort)) invalid(file, node.left, "Only scalar let bindings can be assigned.");
    const rhs = ofSort(file, node.right, readValue(file, node.right, bindings), binding.sort);
    if (node.operator === "=") return { name, binding, rhs };
    if (binding.sort === "integer" && (node.operator === "+=" || node.operator === "-=")) {
      return { name, binding, rhs: `(${binding.code} ${node.operator[0]} ${rhs})` };
    }
    return invalid(file, node, `Unsupported assignment '${node.operator}'.`);
  }

  function line(indent: number, code: string) { lines.push(" ".repeat(indent) + code); }

  function emitArrayGuard(node: Extract<Statement, { type: "IfStatement" }>, bindings: Map<string, Binding>, indent: number) {
    const test = node.test;
    if (test.type !== "CallExpression" || test.callee.type !== "MemberExpression" || test.callee.computed ||
        test.callee.object.type !== "Identifier" || test.callee.object.name !== "Array" ||
        test.callee.property.type !== "Identifier" || test.callee.property.name !== "isArray") return false;
    if (test.typeArguments || test.arguments.length !== 1) invalid(file, test, "Pass one named union value to Array.isArray.");
    const name = nameOf(file, test.arguments[0]);
    const value = bindings.get(name);
    if (value?.sort !== "textOrItems") invalid(file, test, "Array.isArray expects a string-or-record-array binding.");
    arrayGuard = test;
    const narrowed = new Map(bindings), code = `v${locals++}`;
    narrowed.set(name, { sort: "items", code });
    line(indent, `match ${value.code} with`);
    line(indent, `| some ${code} =>`);
    branch(node.consequent, narrowed, indent + 2);
    line(indent, "| none =>");
    if (node.alternate) branch(node.alternate, bindings, indent + 2);
    else line(indent + 2, "pure ()");
    return true;
  }

  function statement(node: Statement, bindings: Map<string, Binding>, indent: number): void {
    switch (node.type) {
      case "EmptyStatement": return;
      case "ReturnStatement": {
        if (!node.argument) invalid(file, node, "Return a value.");
        line(indent, `return ${returned(node.argument, bindings)}`);
        return;
      }
      case "VariableDeclaration": {
        if (node.kind !== "const" && node.kind !== "let") invalid(file, node, "Expected a const or let declaration.");
        for (const decl of node.declarations) {
          const name = nameOf(file, decl.id);
          if (name === "Array") shadowsArray = true;
          if (!decl.init || bindings.has(name)) invalid(file, decl, "Expected a new, initialized binding.");
          const value = readValue(file, decl.init, bindings);
          if (!isScalar(value.sort)) invalid(file, decl, "Keep array and union inputs as named parameters.");
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
        if (emitArrayGuard(node, bindings, indent)) return;
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
        if (item === "Array") shadowsArray = true;
        if (bindings.has(item)) invalid(file, decl, "The loop item must have a new name.");
        const loopScope = new Map(bindings), itemCode = `v${locals++}`;
        loopScope.set(item, { sort: "integer", code: itemCode });
        const inner = node.body.type === "BlockStatement" && node.body.body.length === 1 ? node.body.body[0] : node.body;
        if (inner?.type !== "ExpressionStatement" || inner.expression.type !== "AssignmentExpression") {
          line(indent, `for ${itemCode} in ${values} do`);
          branch(node.body, loopScope, indent + 2);
          return;
        }
        const target = nameOf(file, inner.expression.left), accumulator = bindings.get(target);
        if (!accumulator?.mutable || accumulator.sort !== "integer") invalid(file, inner, "Expected an existing bigint let accumulator.");
        const stateCode = `v${locals++}`;
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
    if (statements.at(-1)?.type !== "ReturnStatement") line(indent, "pure ()");
  }

  function finalReturn(node: Node | undefined) {
    if (node?.type !== "ReturnStatement" || !node.argument) invalid(file, node, "Expected a final return with a value.");
    return returned(node.argument, scope);
  }

  const body = fn.body.body;
  for (const node of body.slice(0, -1)) statement(node, scope, 2);
  line(2, `return ${finalReturn(body.at(-1))}`);
  if (arrayGuard && shadowsArray) invalid(file, arrayGuard, "Array.isArray requires an unshadowed Array built-in.");
  return { params, result, itemType, definition: `${header} Id.run do\n${lines.join("\n")}` };
}
