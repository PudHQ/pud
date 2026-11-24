import type { CallExpression, Node } from "@babel/types";
import { invalid, parseSourceModule } from "@pud/model/source";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isScalar, leanTypes, nameOf, ofSort, readValue, type Value } from "./syntax.ts";
import { lowerSubject, type Subject } from "./subject.ts";

export type Property = { name: string; line: number } & (
  { kind: "todo" } | { kind: "claim"; claim: string; proof?: string }
);

type Scope = ReadonlyMap<string, Value>;
const emptyScope: Scope = new Map();
const authoring = realpathSync(new URL("./authoring.ts", import.meta.url));
const apiNames = new Set(["describe", "expect", "given", "it", "lean"]);

function directCall(node: Node | undefined, name: string): CallExpression | undefined {
  if (node?.type === "CallExpression" && !node.typeArguments && node.callee.type === "Identifier" && node.callee.name === name) return node;
}

function memberCall(node: Node | undefined, allowTypeArguments = false) {
  if (node?.type !== "CallExpression" || (!allowTypeArguments && node.typeArguments) || node.callee.type !== "MemberExpression" ||
      node.callee.computed || node.callee.property.type !== "Identifier") return;
  return { call: node, receiver: node.callee.object, name: node.callee.property.name };
}

function named(node: Node, name: string): boolean { return node.type === "Identifier" && node.name === name; }

function arity(file: string, call: CallExpression, count: number) {
  if (call.arguments.length !== count) invalid(file, call, `Expected ${count} argument(s).`);
  return call.arguments;
}

function stringOf(file: string, node: Node | undefined): string {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0 && node.quasis[0]?.value.cooked != null) {
    return node.quasis[0].value.cooked;
  }
  return invalid(file, node, "Expected a static string.");
}

function blockArrow(file: string, node: Node | undefined, params: number) {
  if (node?.type !== "ArrowFunctionExpression" || node.async || node.typeParameters ||
      node.body.type !== "BlockStatement" || node.params.length !== params) {
    return invalid(file, node, `Expected a synchronous block callback with ${params} parameter(s).`);
  }
  return { params: node.params, statements: node.body.body };
}

function fields(file: string, node: Node | undefined, type: "ObjectExpression" | "ObjectPattern") {
  if (node?.type !== type) invalid(file, node, "Expected an object of named inputs.");
  const keys = new Set<string>();
  return node.properties.map(field => {
    if (field.type !== "ObjectProperty" || field.computed || field.key.type !== "Identifier") {
      return invalid(file, field, "Expected a plain named input field.");
    }
    if (keys.has(field.key.name)) invalid(file, field, "Duplicate input field.");
    keys.add(field.key.name);
    return { key: field.key.name, value: field.value };
  });
}

function leanTerm(file: string, node: Node | undefined, scope: Scope): string {
  const term = memberCall(node);
  if (!term || !named(term.receiver, "lean") || (term.name !== "ref" && term.name !== "inline")) {
    return invalid(file, node, "Expected lean.ref() or lean.inline().");
  }
  const [head, ...args] = term.call.arguments;
  const source = stringOf(file, head);
  if (term.name === "ref" && !/^[A-Za-z_][A-Za-z0-9_']*(\.[A-Za-z_][A-Za-z0-9_']*)*$/.test(source)) {
    invalid(file, head, "Use a qualified Lean name in lean.ref().");
  }
  const callee = term.name === "ref" ? source : `(${source})`;
  return [callee, ...args.map(arg => readValue(file, arg, scope).code)].join(" ");
}

const operators = { eq: "=", gt: ">", gte: "≥", lt: "<", lte: "≤" } as const;

function schema(file: string, node: Node | undefined, value: Value, scope: Scope, itemType?: string): string[] {
  const chain = memberCall(node);
  if (!chain) return invalid(file, node, "Expected a Lean schema chain.");
  const { call, receiver, name } = chain;
  if (named(receiver, "lean")) {
    if (((value.sort === "integers" || value.sort === "items") && name === "array") ||
        (value.sort === "textOrItems" && name === "textOrArray")) {
      const [item] = arity(file, call, 1);
      const element = memberCall(item, true);
      if (element && named(element.receiver, "lean") && !element.call.arguments.length) {
        const types = element.call.typeArguments?.type === "TSTypeParameterInstantiation" ? element.call.typeArguments.params : [];
        if (value.sort === "integers" && element.name === "int" && !element.call.typeArguments) return [];
        if (value.sort !== "integers" && element.name === "opaque" && types.length === 1 &&
            types[0]?.type === "TSTypeReference" && !types[0].typeArguments && types[0].typeName.type === "Identifier" &&
            types[0].typeName.name === itemType) return [];
      }
    } else if ((value.sort === "integer" && name === "int") || (value.sort === "boolean" && name === "bool")) {
      arity(file, call, 0);
      return [];
    }
    return invalid(file, node, `Expected a ${leanTypes[value.sort]} schema.`);
  }
  const clauses = schema(file, receiver, value, scope, itemType);
  const [arg] = arity(file, call, 1);
  if (name === "satisfies" && value.sort !== "textOrItems") {
    return [...clauses, `((${leanTerm(file, arg, scope)} ${value.code}) : Prop)`];
  }
  if (!Object.hasOwn(operators, name) || !isScalar(value.sort) || (value.sort === "boolean" && name !== "eq")) {
    return invalid(file, node, `Unknown ${leanTypes[value.sort]} matcher '${name}'.`);
  }
  const rhs = ofSort(file, arg!, readValue(file, arg!, scope), value.sort);
  return [...clauses, `(${value.code} ${operators[name as keyof typeof operators]} ${rhs})`];
}

function compileProperty(file: string, subject: Subject, binding: string, node: CallExpression, name: string, allowGiven: boolean, proof?: string) {
  const [, inputSchemas, callback] = arity(file, node, 3);
  const { params, statements } = blockArrow(file, callback, 1);
  const byName = new Map(subject.params.map(p => [p.name, p]));
  const domain = fields(file, inputSchemas, "ObjectExpression");
  if (domain.length !== byName.size) invalid(file, inputSchemas, "Declare one input schema per function parameter.");
  const premises = domain.flatMap(({ key, value }) => {
    const parameter = byName.get(key) ?? invalid(file, value, `No parameter named '${key}'.`);
    return schema(file, value, parameter, emptyScope, subject.itemType);
  });
  const scope = new Map<string, Value>();
  const inputs = fields(file, params[0], "ObjectPattern");
  if (inputs.length !== byName.size) invalid(file, params[0], "Destructure every input in the property callback.");
  for (const { key, value } of inputs) {
    const parameter = byName.get(key) ?? invalid(file, value, `No parameter named '${key}'.`);
    const alias = nameOf(file, value);
    if (scope.has(alias) || apiNames.has(alias) || alias === binding) invalid(file, value, "Input bindings cannot shadow the subject or proof API.");
    scope.set(alias, parameter);
  }
  const result = { sort: subject.result, code: "result" };
  const aliases = new Set<string>();
  const conclusions: string[] = [];

  function checkSubjectCall(expression: Node | null | undefined) {
    const call = directCall(expression ?? undefined, binding);
    if (!call) invalid(file, expression ?? undefined, `Call the imported ${binding} export directly.`);
    const args = arity(file, call, subject.params.length);
    for (const [i, arg] of args.entries()) {
      if (arg.type !== "Identifier" || scope.get(arg.name) !== subject.params[i]) {
        invalid(file, arg, "Pass the declared inputs to the subject in parameter order.");
      }
    }
  }

  for (const step of statements) {
    if (step.type === "VariableDeclaration" && step.kind === "const" && step.declarations.length === 1) {
      const local = step.declarations[0]!;
      const alias = nameOf(file, local.id);
      if (scope.has(alias) || aliases.has(alias) || apiNames.has(alias) || alias === binding) {
        invalid(file, local.id, "Use a fresh name for the subject result.");
      }
      checkSubjectCall(local.init);
      aliases.add(alias);
      continue;
    }
    if (step.type !== "ExpressionStatement") invalid(file, step, "Use given(), a subject call, or expect().to().");
    const given = directCall(step.expression, "given");
    if (given) {
      if (!allowGiven) invalid(file, step, "Import 'given' from the proof authoring API.");
      if (conclusions.length) invalid(file, step, "Put given() before the assertions.");
      const [condition] = arity(file, given, 1);
      const test = ofSort(file, condition!, readValue(file, condition!, scope), "boolean");
      premises.push(`(${test} = true)`);
      continue;
    }
    const to = memberCall(step.expression);
    const expect = to?.name === "to" ? directCall(to.receiver, "expect") : undefined;
    if (!to || !expect) invalid(file, step, "Expected expect(result).to(lean.…).");
    const [expression] = arity(file, expect, 1);
    if (expression?.type !== "Identifier" || !aliases.has(expression.name)) checkSubjectCall(expression);
    const [matcher] = arity(file, to.call, 1);
    const clauses = schema(file, matcher, result, scope, subject.itemType);
    if (!clauses.length) invalid(file, matcher, "Add a constraint to the result schema.");
    conclusions.push(...clauses);
  }
  if (!conclusions.length) invalid(file, node, "Add an assertion or use it.todo().");

  const binders = [subject.itemType && "(Item : Type)", ...subject.params.map(param => `(${param.code} : ${leanTypes[param.sort]})`)].filter(Boolean).join(" ");
  const args = [subject.itemType && "(Item := Item)", ...subject.params.map(param => param.code)].filter(Boolean).join(" ");
  const claim = [binders && `∀ ${binders},`, ...premises.map(p => `${p} →`), `let result := impl ${args}`.trimEnd(),
    conclusions.join(" ∧\n")].filter(Boolean).join("\n");
  return { kind: "claim", name, line: node.loc!.start.line, claim, proof } satisfies Property;
}

export function readSidecar(file: string, read: (file: string) => string) {
  if (!file.endsWith(".proof.ts")) invalid(file, undefined, "Expected a *.proof.ts file.");
  const { body } = parseSourceModule(file, read(file));
  const base = dirname(realpathSync(file));
  const imports = new Map<string, { path: string; symbol: string }>(), helpers = new Set<string>();
  const support: string[] = [];
  let suite: CallExpression | undefined;

  function localPath(path: string, at: Node, extension: string) {
    if (!/^\.\.?\//.test(path) || !path.endsWith(extension) || path.endsWith(".d.ts")) {
      invalid(file, at, `Expected a relative ${extension} path with its extension.`);
    }
    return resolve(base, path);
  }

  function needHelper(name: string, node: Node) {
    if (!helpers.has(name)) invalid(file, node, `Import '${name}' from the proof authoring API.`);
  }

  for (const statement of body) {
    if (suite) invalid(file, statement, "Expected a single describe() suite after imports and Lean support files.");
    if (statement.type === "ImportDeclaration" && statement.importKind === "type") continue;
    if (statement.type === "ImportDeclaration") {
      if (statement.attributes?.length || statement.phase || !statement.specifiers.length) invalid(file, statement, "Use named value imports.");
      const path = localPath(statement.source.value, statement.source, ".ts");
      const isAuthoring = realpathSync(path) === authoring;
      for (const specifier of statement.specifiers) {
        if (specifier.type !== "ImportSpecifier" || specifier.imported.type !== "Identifier") invalid(file, specifier, "Use named value imports.");
        if (specifier.importKind === "type") continue;
        const symbol = specifier.imported.name, local = specifier.local.name;
        if (isAuthoring) {
          if (symbol !== local || !apiNames.has(symbol)) invalid(file, specifier, "Use the proof authoring names without aliases.");
          helpers.add(symbol);
        } else imports.set(local, { path, symbol });
      }
      continue;
    }
    if (statement.type !== "ExpressionStatement") invalid(file, statement, "Expected imports, lean.use(), and describe().");
    const use = memberCall(statement.expression);
    if (use?.name === "use" && named(use.receiver, "lean")) {
      needHelper("lean", use.call);
      const [path] = arity(file, use.call, 1);
      support.push(localPath(stringOf(file, path), path!, ".lean"));
    } else {
      suite = directCall(statement.expression, "describe");
      if (!suite) invalid(file, statement, "Expected describe(subject, () => { ... }).");
    }
  }
  if (!suite) invalid(file, undefined, "Expected a describe() suite.");
  needHelper("describe", suite);
  needHelper("it", suite);
  const [target, block] = arity(file, suite, 2);
  const binding = nameOf(file, target);
  const imported = imports.get(binding) ?? invalid(file, target, "The subject must be a named TS import.");
  let subject: Subject | undefined;
  const { statements } = blockArrow(file, block, 0);
  const names = new Set<string>();
  const properties = statements.map((statement): Property => {
    if (statement.type !== "ExpressionStatement") invalid(file, statement, "Use it() and it.todo() in the suite.");
    const member = memberCall(statement.expression);
    const todo = member?.name === "todo" && named(member.receiver, "it");
    const by = member?.name === "by" ? member : undefined;
    const call = todo ? member.call : directCall(by ? by.receiver : statement.expression, "it");
    if (!call) invalid(file, statement, "Use it() and it.todo() in the suite.");
    const name = stringOf(file, call.arguments[0]);
    if (!name.trim() || names.has(name)) invalid(file, call, "Use a unique, non-empty property title.");
    names.add(name);
    if (todo) {
      arity(file, call, 1);
      return { kind: "todo", name, line: call.loc!.start.line };
    }
    needHelper("expect", call);
    needHelper("lean", call);
    const proof = by ? leanTerm(file, arity(file, by.call, 1)[0], emptyScope) : undefined;
    subject ??= lowerSubject(imported.path, imported.symbol, read(imported.path));
    return compileProperty(file, subject, binding, call, name, helpers.has("given"), proof);
  });
  if (!properties.length) invalid(file, suite, "Add at least one property or it.todo() to the suite.");
  return { subject, properties, support: subject ? [...new Set(support)].map(path => ({ path, source: read(path) })) : [] };
}
