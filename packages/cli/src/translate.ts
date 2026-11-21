import { returnStatement, type ArrowFunctionExpression, type Identifier, type Node } from "@babel/types";
import { ref, returnedExpression, type Expr, type Sort } from "@pud/model";
import type { ReviewedProperty, SubjectSource } from "@pud/model/adapter";
import { readBlock, readExpression } from "@pud/model/typescript";
import { readFileSync } from "node:fs";
import { selectSubject } from "@pud/model/module";
import { invalid, parseSourceModule, propertyArrow } from "@pud/model/source";
export type RuntimeValue = bigint | boolean;

export interface Model {
  params: { name: string; label: string; sort: Sort }[];
  result: Sort;
  returned: Expr;
  property?: Expr;
  replay?: {
    run(...args: RuntimeValue[]): RuntimeValue;
    holds(...argsAndResult: RuntimeValue[]): boolean;
  };
}

function sort(file: string, annotation: Node | null | undefined, at: Node): Sort {
  if (annotation?.type === "TSTypeAnnotation") {
    if (annotation.typeAnnotation.type === "TSBigIntKeyword") return "integer";
    if (annotation.typeAnnotation.type === "TSBooleanKeyword") return "boolean";
  }
  return invalid(file, at, "Use an explicit bigint or boolean type.");
}

function identifier(file: string, param: Node): Identifier {
  if (param.type !== "Identifier" || param.name === "this" || param.optional || param.decorators?.length) {
    invalid(file, param, "Expected a required, named value parameter.");
  }
  return param;
}

function expression(file: string, node: Node, scope: Map<string, Expr>): Expr {
  return readExpression(file, node, n => n.type === "Identifier"
    ? scope.get(n.name) ?? invalid(file, n, `Only parameters may be referenced, or initialized local constants: ${n.name}`)
    : undefined);
}

export function translate(file: string, name: string, reviewed?: ReviewedProperty): Model {
  return translateSource({ file, name, source: readFileSync(file, "utf8") }, reviewed);
}

function pureBody(file: string, node: ArrowFunctionExpression["body"], bindings: Map<string, Expr>, result: Sort | undefined, mismatch: string) {
  let locals = 0;
  const statements = node.type === "BlockStatement" ? node.body : [returnStatement(node)];
  const body = readBlock<Expr, never, Expr>(statements, bindings, {
    file,
    condition: (node, env) => expression(file, node, env),
    returned(node, env, at) {
      if (!node) invalid(file, at, "Expected a return value on every path.");
      const value = expression(file, node, env);
      if (result === undefined) result = value.sort;
      else if (value.sort !== result) invalid(file, node, mismatch);
      return value;
    },
    statement(node, env) {
      if (node.type !== "VariableDeclaration" || node.kind !== "const") {
        invalid(file, node, `Unsupported TypeScript: ${node.type}. Expected const, if or return.`);
      }
      return node.declarations.map(d => {
        const id = identifier(file, d.id);
        if (!d.init || env.has(id.name)) invalid(file, d, "Expected a new, initialized local constant.");
        const value = expression(file, d.init, env);
        if (id.typeAnnotation && sort(file, id.typeAnnotation, id) !== value.sort) invalid(file, id, "Local constant type mismatch.");
        const name = `v${locals++}`;
        env.set(id.name, ref(value.sort, name));
        return { kind: "let", name, value };
      });
    },
  });
  const returned = returnedExpression(body);
  if (!returned) invalid(file, node, "Expected a return on every path.");
  return { body, returned, result: returned.sort };
}

function nativeFunction<R extends RuntimeValue>(source: string): (...args: RuntimeValue[]) => R {
  const js = new Bun.Transpiler({ loader: "ts" }).transformSync(`const pudReplay = (\n${source}\n);`);
  return new Function('"use strict";\n' + js + '\nreturn pudReplay;')();
}

export function implementation({ file, name, source }: SubjectSource) {
  const fn = selectSubject(parseSourceModule(file, source), file, name, { allowArrowFunctions: true });
  if (fn.async || fn.generator || fn.typeParameters) invalid(file, fn, "Async, generator and generic functions need a matching model.");
  const bindings = new Map<string, Expr>();
  const params = fn.params.map((p, i) => {
    const id = identifier(file, p);
    const name = `p${i}`, type = sort(file, id.typeAnnotation, id);
    bindings.set(id.name, ref(type, name));
    return { name, label: id.name, sort: type };
  });
  const declared = fn.returnType ? sort(file, fn.returnType, fn) : undefined;
  const mismatch = declared ? "The returned type does not match the declared return type." : "All returns must have the same bigint or boolean type.";
  const body = pureBody(file, fn.body, bindings, declared, mismatch);
  return { params, ...body, run: nativeFunction<RuntimeValue>(source.slice(fn.start!, fn.end!)) };
}

export function bindProperty({ params, result }: Pick<Model, "params" | "result">, reviewed: ReviewedProperty) {
  const node = propertyArrow(reviewed);
  if (node.async || node.typeParameters) invalid(reviewed.file, node, "The property must be a synchronous arrow function.");
  const inputs = [...params, { sort: result, name: "result" }];
  if (node.params.length !== inputs.length) {
    invalid(reviewed.file, node, `The property must take the ${params.length} subject argument(s), followed by the result.`);
  }
  const propertyBindings = new Map<string, Expr>();
  node.params.forEach((p, i) => {
    const id = identifier(reviewed.file, p), input = inputs[i]!;
    if (id.typeAnnotation && sort(reviewed.file, id.typeAnnotation, id) !== input.sort) {
      invalid(reviewed.file, id, "The property's parameter type must match the subject signature.");
    }
    propertyBindings.set(id.name, ref(input.sort, input.name));
  });
  if (node.returnType && sort(reviewed.file, node.returnType, node) !== "boolean") {
    invalid(reviewed.file, node, "The property must return a boolean.");
  }
  const { returned } = pureBody(reviewed.file, node.body, propertyBindings, "boolean", "The property must return a boolean.");
  return { property: returned, holds: nativeFunction<boolean>(reviewed.source) };
}

export function translateSource(subject: SubjectSource, reviewed?: ReviewedProperty): Model {
  const fn = implementation(subject);
  if (!reviewed) return fn;
  const { property, holds } = bindProperty(fn, reviewed);
  return { ...fn, property, replay: { run: fn.run, holds } };
}
