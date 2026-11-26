import type { CallExpression, Node, Program, StringLiteral } from "@babel/types";
import manifest from "../package.json";
import type { NativeProofTerm, PreparedProofAssistant, ProofCall, ProofClaim, ProofComparison, ProofConstraint, ProofErrorKind, ProofExpression, ProofPredicate, ProofTarget, ProofType } from "./assistant.ts";
import { invalid, resolveTypeScriptImport } from "./source.ts";
import { dirname, resolve } from "node:path";

const authoringPackage = manifest.name;
const portableHelpers = new Set(["describe", "expect", "given", "it", "native", "pud"]);
const configuredHelpers = new Set(["expect", "given", "it", "pud", "use"]);
const comparisons = new Set<string>(["eq", "gt", "gte", "lt", "lte"] satisfies ProofComparison[]);
const assistantId = /^[a-z][a-z0-9_-]*$/;
const qualifiedName = /^[A-Za-z_][A-Za-z0-9_']*(\.[A-Za-z_][A-Za-z0-9_']*)*$/;
const emptyBindings = new Map<string, string>();

type SuiteProperty = { name: string; line: number } & (
  | { kind: "todo" }
  | { kind: "claim"; call: CallExpression; proof?: Node }
);

export interface Suite {
  file: string;
  source: string;
  subject: { file: string; name: string };
  subjects: ReadonlyMap<string, { file: string; name: string }>;
  binding: string;
  properties: SuiteProperty[];
  modules: { assistant: string; file: string }[];
  helpers: ReadonlyMap<string, string>;
  schemaBindings: ReadonlySet<string>;
  native: ReadonlyMap<string, string>;
  configured: boolean;
  imports: { path: string; resolveAgain: () => string }[];
}

function named(node: Node | null | undefined, name: string | undefined): boolean {
  return name !== undefined && node?.type === "Identifier" && node.name === name;
}

function identifier(file: string, node: Node | null | undefined): string {
  if (node?.type !== "Identifier" || node.name === "this" || node.optional || node.decorators?.length) {
    return invalid(file, node ?? undefined, "Expected a named binding.");
  }
  return node.name;
}

function directCall(node: Node | null | undefined, name: string | undefined): CallExpression | undefined {
  if (node?.type === "CallExpression" && !node.typeArguments && named(node.callee, name)) return node;
}

function memberCall(node: Node | undefined, typeArguments = false) {
  if (node?.type !== "CallExpression" || (!typeArguments && node.typeArguments) || node.callee.type !== "MemberExpression" ||
      node.callee.computed || node.callee.property.type !== "Identifier") return;
  return { call: node, receiver: node.callee.object, name: node.callee.property.name };
}

function arity(file: string, call: CallExpression, count: number) {
  if (call.arguments.length !== count) invalid(file, call, `Expected ${count} argument(s).`);
  return call.arguments;
}

function staticString(file: string, node: Node | undefined): string {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && !node.expressions.length && node.quasis[0]?.value.cooked != null) {
    return node.quasis[0].value.cooked;
  }
  return invalid(file, node, "Expected a static string.");
}

function blockArrow(file: string, node: Node | undefined, count: number) {
  if (node?.type !== "ArrowFunctionExpression" || node.async || node.typeParameters ||
      node.body.type !== "BlockStatement" || node.params.length !== count) {
    return invalid(file, node, `Expected a synchronous block callback with ${count} parameter(s).`);
  }
  return { params: node.params, statements: node.body.body };
}

function fields(file: string, node: Node | undefined, kind: "ObjectExpression" | "ObjectPattern") {
  if (node?.type !== kind) invalid(file, node, "Expected an object of named fields.");
  const keys = new Set<string>();
  return node.properties.map(field => {
    if (field.type !== "ObjectProperty" || field.computed || field.key.type !== "Identifier") {
      return invalid(file, field, "Expected a plain named field.");
    }
    const key = field.key.name;
    if (keys.has(key)) invalid(file, field, `Duplicate field '${key}'.`);
    keys.add(key);
    return { key, value: field.value };
  });
}

const relativeConfig = /^\.\.?\/(?:.*\/)?pud\.config(?:\.ts)?$/;

export function readSuite(file: string, origin: string, source: string, program: Program, config?: string): Suite {
  const manifest = program.body.find(node => node.type === "ExportDefaultDeclaration");
  if (manifest) invalid(file, manifest, `Declare a suite with describe() from '${authoringPackage}' or pud.describe() from the project config.`);

  const base = dirname(origin);
  const helpers = new Map<string, string>();
  const native = new Map<string, string>();
  const subjects = new Map<string, Suite["subject"]>();
  const imports: Suite["imports"] = [];
  const paths = new Map<string, string>();
  function resolveImport(specifier: StringLiteral) {
    const cached = paths.get(specifier.value);
    if (cached) return cached;
    const resolveAgain = () => resolveTypeScriptImport(file, specifier, base);
    const path = resolveAgain();
    if (!specifier.value.endsWith(".ts")) imports.push({ path, resolveAgain });
    paths.set(specifier.value, path);
    return path;
  }
  let configBinding: string | undefined;
  let describe: CallExpression | undefined;
  let configured = false;
  for (const statement of program.body) {
    if (describe) invalid(file, statement, "Expected one describe() suite after the imports.");
    if (statement.type === "ImportDeclaration") {
      if (statement.importKind === "type") continue;
      if (statement.attributes?.length || statement.phase || !statement.specifiers.length) {
        invalid(file, statement, "Import proof helpers and the subject by name.");
      }
      const path = statement.source.value;
      if (relativeConfig.test(path)) {
        const [spec] = statement.specifiers;
        if (configBinding || statement.specifiers.length !== 1 || spec?.type !== "ImportDefaultSpecifier" ||
            resolveImport(statement.source) !== config) {
          invalid(file, statement, "Import the default export of this project's pud.config.ts.");
        }
        configBinding = spec.local.name;
        continue;
      }
      for (const spec of statement.specifiers) {
        if (spec.type !== "ImportSpecifier" || spec.imported.type !== "Identifier") invalid(file, spec, "Use named imports.");
        if (spec.importKind === "type") continue;
        const { imported, local } = spec;
        if (path === authoringPackage && portableHelpers.has(imported.name)) {
          if (helpers.has(imported.name)) invalid(file, spec, "Import each proof helper once.");
          helpers.set(imported.name, local.name);
        } else if (path === `${authoringPackage}/lean` && imported.name === "lean") {
          native.set(local.name, "lean");
        } else {
          subjects.set(local.name, { file: resolveImport(statement.source), name: imported.name });
        }
      }
      continue;
    }
    if (statement.type === "VariableDeclaration" && statement.kind === "const" && statement.declarations.length === 1) {
      const declaration = statement.declarations[0]!;
      const call = directCall(declaration.init, helpers.get("native"));
      if (call) {
        const [argument] = arity(file, call, 1);
        const id = staticString(file, argument);
        if (!assistantId.test(id)) invalid(file, argument, "Use a literal proof assistant identifier.");
        native.set(identifier(file, declaration.id), id);
        continue;
      }
    }
    if (statement.type !== "ExpressionStatement") invalid(file, statement, "Expected imports and describe().");
    const call = memberCall(statement.expression);
    if (call?.name === "describe" && named(call.receiver, configBinding)) {
      describe = call.call;
      configured = true;
    } else {
      describe = directCall(statement.expression, helpers.get("describe"));
      if (!describe) invalid(file, statement, "Use describe(subject, callback) or pud.describe(subject, callback).");
    }
  }

  if (!describe) invalid(file, undefined, "Expected a describe() suite.");
  const [target, callback] = arity(file, describe, 2);
  const binding = identifier(file, target);
  const subject = subjects.get(binding) ?? invalid(file, target, "The subject must be a named TypeScript import.");
  const { params, statements } = blockArrow(file, callback, configured ? 1 : 0);
  if (configured) {
    helpers.clear();
    for (const { key, value } of fields(file, params[0], "ObjectPattern")) {
      if (!configuredHelpers.has(key)) invalid(file, value, `Unknown proof helper '${key}'.`);
      const name = identifier(file, value);
      if (subjects.has(name) || native.has(name)) invalid(file, value, "Proof helpers cannot shadow an imported function or a native tag.");
      helpers.set(key, name);
    }
  }
  const schemaBindings = new Set<string>();
  const schemaHelper = helpers.get("pud");
  if (schemaHelper) schemaBindings.add(schemaHelper);
  if (configured && configBinding && ![...helpers.values()].includes(configBinding)) schemaBindings.add(configBinding);

  const properties: SuiteProperty[] = [];
  const modules: Suite["modules"] = [];
  const names = new Set<string>();
  for (const statement of statements) {
    if (statement.type !== "ExpressionStatement") invalid(file, statement, "Use it(), it.todo(), or use() in the suite.");
    const use = directCall(statement.expression, helpers.get("use"));
    if (use) {
      if (properties.length) invalid(file, statement, "Declare native modules before properties.");
      const [argument] = arity(file, use, 1);
      const module = memberCall(argument);
      const assistant = module?.receiver.type === "Identifier" && native.get(module.receiver.name);
      if (module?.name !== "module" || !assistant) invalid(file, argument, "Use an assistant's module() helper.");
      const [path] = arity(file, module.call, 1);
      const specifier = staticString(file, path);
      if (!/^\.\.?\//.test(specifier)) invalid(file, path, "Use a relative path to the proof module.");
      modules.push({ assistant, file: resolve(base, specifier) });
      continue;
    }
    const member = memberCall(statement.expression);
    const todo = member?.name === "todo" && named(member.receiver, helpers.get("it"));
    const by = member?.name === "by" ? member : undefined;
    const call = todo ? member.call : directCall(by ? by.receiver : statement.expression, helpers.get("it"));
    if (!call) invalid(file, statement, "Use it() or it.todo() for each property.");
    const name = staticString(file, call.arguments[0]);
    if (!name.trim() || names.has(name)) invalid(file, call, "Use a unique, non-empty property title.");
    names.add(name);
    const line = call.loc!.start.line;
    if (todo) {
      arity(file, call, 1);
      properties.push({ kind: "todo", name, line });
    } else {
      const proof = by && arity(file, by.call, 1)[0];
      properties.push({ kind: "claim", name, line, call, proof });
    }
  }
  if (!properties.length) invalid(file, describe, "Add at least one property or an it.todo().");
  return { file, source, subject, subjects, binding, properties, modules, helpers, schemaBindings, native, configured, imports };
}

function expression(suite: Suite, node: Node | undefined, bindings: ReadonlyMap<string, string>): ProofExpression {
  if (!node || node.type === "SpreadElement" || node.type === "ArgumentPlaceholder") {
    return invalid(suite.file, node, "Expected a TypeScript expression.");
  }
  const at = node.loc!.start;
  return { file: suite.file, source: suite.source.slice(node.start!, node.end!), line: at.line,
    column: at.column, offset: node.start!, bindings, schemaBindings: suite.schemaBindings };
}

function nativeTerm(suite: Suite, node: Node | undefined, bindings: ReadonlyMap<string, string>): NativeProofTerm {
  const { file, native } = suite;
  if (!suite.configured) invalid(file, node, "Import pud from pud.config.ts and use pud.describe() for native proof terms.");
  if (node?.type === "TaggedTemplateExpression" && !node.typeArguments && node.tag.type === "Identifier") {
    const assistant = native.get(node.tag.name);
    if (assistant) {
      const parts = node.quasi.quasis.map(part => part.value.cooked ?? invalid(file, part, "Invalid escape in the native proof template."));
      return { kind: "template", assistant, parts, args: node.quasi.expressions.map(arg => expression(suite, arg, bindings)) };
    }
  }
  const reference = memberCall(node);
  const assistant = reference?.receiver.type === "Identifier" && native.get(reference.receiver.name);
  if (!assistant || reference?.name !== "ref") return invalid(file, node, "Use a native proof template or a named reference.");
  const [head, ...args] = reference.call.arguments;
  const name = staticString(file, head);
  if (!qualifiedName.test(name)) invalid(file, head, "Expected a qualified theorem or predicate name.");
  return { kind: "reference", assistant, name, args: args.map(arg => expression(suite, arg, bindings)) };
}

function isSchemaBuilder(suite: Suite, node: Node): boolean {
  return node.type === "Identifier" && suite.schemaBindings.has(node.name);
}

function isSchema(suite: Suite, node: Node | undefined, type: ProofType): boolean {
  const schema = memberCall(node, true);
  if (!schema || !isSchemaBuilder(suite, schema.receiver)) return false;
  const { name, call } = schema;
  if (type.kind === "opaque") {
    const args = call.typeArguments;
    const item = args?.type === "TSTypeParameterInstantiation" && args.params[0];
    return name === "opaque" && !call.arguments.length && !!item && args.params.length === 1 &&
      item.type === "TSTypeReference" && !item.typeArguments && named(item.typeName, type.name);
  }
  if (call.typeArguments) return false;
  switch (type.kind) {
    case "integer": return (name === "bigint" || name === "int") && !call.arguments.length;
    case "boolean": return (name === "boolean" || name === "bool") && !call.arguments.length;
    case "array":
    case "textOrArray": return name === type.kind && call.arguments.length === 1 && isSchema(suite, call.arguments[0], type.item);
  }
}

function schemaHint(type: ProofType): string {
  switch (type.kind) {
    case "integer": return "pud.bigint()";
    case "boolean": return "pud.boolean()";
    case "opaque": return `pud.opaque<${type.name}>()`;
    case "array":
    case "textOrArray": return `pud.${type.kind}(${schemaHint(type.item)})`;
  }
}

function predicateCallback(suite: Suite, node: Node | undefined, bindings: ReadonlyMap<string, string>) {
  const { file, schemaBindings } = suite;
  if (node?.type !== "ArrowFunctionExpression" || node.async || node.typeParameters || node.params.length !== 1) {
    return invalid(file, node, "Use a synchronous predicate with one parameter.");
  }
  const variable = identifier(file, node.params[0]);
  if (schemaBindings.has(variable) || suite.native.has(variable)) {
    invalid(file, node.params[0], "The predicate parameter cannot shadow Pud's helpers or a native tag.");
  }
  if (node.body.type !== "BlockStatement") return { variable, predicate: proofPredicate(suite, node.body, bindings) };
  const [statement] = node.body.body;
  if (node.body.body.length !== 1 || statement?.type !== "ReturnStatement" || !statement.argument) {
    return invalid(file, node.body, "Return a single predicate expression.");
  }
  return { variable, predicate: proofPredicate(suite, statement.argument, bindings) };
}

function quantifiedType(suite: Suite, node: Node | undefined): "integer" | "boolean" | undefined {
  const chain = memberCall(node, true);
  if (!chain) return;
  if (!isSchemaBuilder(suite, chain.receiver)) return quantifiedType(suite, chain.receiver);
  if (chain.name === "bigint" || chain.name === "int") return "integer";
  if (chain.name === "boolean" || chain.name === "bool") return "boolean";
}

function proofPredicate(suite: Suite, node: Node | undefined, bindings: ReadonlyMap<string, string>): ProofPredicate {
  const call = memberCall(node, true);
  if (!call || !isSchemaBuilder(suite, call.receiver)) return { kind: "boolean", expression: expression(suite, node, bindings) };
  const read = (part: Node | undefined) => proofPredicate(suite, part, bindings);
  switch (call.name) {
    case "not": {
      const [operand] = arity(suite.file, call.call, 1);
      return { kind: "not", operand: read(operand) };
    }
    case "and":
    case "or":
    case "implies":
    case "iff": {
      const [left, right] = arity(suite.file, call.call, 2);
      return { kind: "binary", operator: call.name, left: read(left), right: read(right) };
    }
    case "forall":
    case "exists": {
      const [input, callback] = arity(suite.file, call.call, 2);
      const type = quantifiedType(suite, input);
      const domain = type ? { kind: "schema" as const, type,
        constraints: schemaConstraints(suite, input, { kind: type }, { kind: "quantified" }, bindings),
      } : { kind: "array" as const, expression: expression(suite, input, bindings) };
      return { kind: "quantifier", quantifier: call.name, domain, ...predicateCallback(suite, callback, bindings) };
    }
    default: return { kind: "boolean", expression: expression(suite, node, bindings) };
  }
}

function schemaConstraints(suite: Suite, node: Node | undefined, type: ProofType, target: ProofTarget, bindings: ReadonlyMap<string, string>): ProofConstraint[] {
  if (isSchema(suite, node, type)) return [];
  const chain = memberCall(node);
  if (!chain || isSchemaBuilder(suite, chain.receiver)) {
    const value = target.kind === "result" ? "the result"
      : target.kind === "quantified" ? "the quantified value" : `parameter '${target.name}'`;
    return invalid(suite.file, node, `Use ${schemaHint(type)} for ${value}.`);
  }
  const constraints = schemaConstraints(suite, chain.receiver, type, target, bindings);
  const [value] = arity(suite.file, chain.call, 1);
  if (chain.name === "refine") {
    constraints.push({ kind: "refinement", target, ...predicateCallback(suite, value, bindings) });
  } else if (chain.name === "satisfies" && type.kind !== "textOrArray" && type.kind !== "opaque") {
    constraints.push({ kind: "native", target, term: nativeTerm(suite, value, bindings) });
  } else if ((type.kind === "integer" && comparisons.has(chain.name)) || (type.kind === "boolean" && chain.name === "eq")) {
    constraints.push({ kind: "comparison", target, operator: chain.name as ProofComparison, value: expression(suite, value, bindings) });
  } else invalid(suite.file, node, `Unknown ${type.kind} matcher '${chain.name}'.`);
  return constraints;
}

export function bindClaim(suite: Suite, property: Extract<SuiteProperty, { kind: "claim" }>, subject: PreparedProofAssistant): ProofClaim {
  const { file, helpers } = suite;
  const [, schemas, callback] = arity(file, property.call, 3);
  const { params, statements } = blockArrow(file, callback, 1);
  const parameters = new Map(subject.parameters.map(p => [p.name, p.type]));
  const domain = fields(file, schemas, "ObjectExpression");
  if (domain.length !== parameters.size) invalid(file, schemas, "Declare one input schema per subject parameter.");
  const premises = domain.flatMap(({ key, value }) => {
    const type = parameters.get(key) ?? invalid(file, value, `No subject parameter named '${key}'.`);
    return schemaConstraints(suite, value, type, { kind: "parameter", name: key }, emptyBindings);
  });
  const bindings = new Map<string, string>();
  const reserved = new Set([...helpers.values(), ...suite.schemaBindings, ...suite.native.keys(), ...suite.subjects.keys()]);
  const inputs = fields(file, params[0], "ObjectPattern");
  if (inputs.length !== parameters.size) invalid(file, params[0], "Destructure every input in the property callback.");
  for (const { key, value } of inputs) {
    if (!parameters.has(key)) invalid(file, value, `No subject parameter named '${key}'.`);
    const alias = identifier(file, value);
    if (bindings.has(alias) || reserved.has(alias)) invalid(file, value, "Input bindings cannot shadow the subject or proof helpers.");
    bindings.set(alias, key);
  }
  const results = new Map<string, ProofCall>();
  const assertions: ProofConstraint[] = [];
  let observation: ProofCall | undefined;
  let observationKey: string | undefined;
  let resultType = subject.result;
  let reference: ProofCall | undefined;
  let expectedError: ProofErrorKind | undefined;

  function readCall(node: Node | null | undefined): ProofCall {
    const callee = node?.type === "CallExpression" && !node.typeArguments && node.callee.type === "Identifier"
      ? node.callee.name : undefined;
    const linked = callee && suite.subjects.get(callee);
    if (!linked || node?.type !== "CallExpression") {
      return invalid(file, node ?? undefined, "Call a named TypeScript import directly.");
    }
    return {
      kind: "call", callee: callee === suite.binding ? "subject" : linked,
      args: node.arguments.map(arg => {
        const parameter = arg.type === "Identifier" && bindings.get(arg.name);
        return parameter ? { kind: "parameter", name: parameter } : readCall(arg);
      }),
    };
  }

  const includesSubject = (call: ProofCall): boolean => call.callee === "subject" ||
    call.args.some(arg => arg.kind === "call" && includesSubject(arg));
  function observe(call: ProofCall, at: Node) {
    const key = JSON.stringify(call);
    if (observationKey !== undefined && observationKey !== key) {
      invalid(file, at, "Use one observed call expression per property.");
    }
    if (observationKey !== undefined) return;
    observationKey = key;
    const direct = call.callee === "subject" && call.args.every(arg => arg.kind === "parameter");
    if (direct) {
      if (call.args.length !== parameters.size || call.args.some((arg, index) =>
        arg.kind !== "parameter" || arg.name !== subject.parameters[index]!.name)) {
        invalid(file, at, "Pass the declared inputs to the subject in parameter order.");
      }
      return;
    }
    if (!includesSubject(call)) invalid(file, at, "The observed expression must call the subject of the suite.");
    if (!subject.inspectCall) invalid(file, at, "The selected assistant does not support composed calls.");
    resultType = subject.inspectCall(call);
    observation = call;
  }

  for (const step of statements) {
    if (step.type === "VariableDeclaration" && step.kind === "const" && step.declarations.length === 1) {
      const local = step.declarations[0]!;
      const name = identifier(file, local.id);
      if (reserved.has(name) || bindings.has(name) || results.has(name)) invalid(file, local.id, "Use a fresh binding for the subject result.");
      if (expectedError) invalid(file, local, "Keep the throwing call inside expect's callback.");
      const call = readCall(local.init);
      observe(call, local);
      results.set(name, call);
      continue;
    }
    if (step.type !== "ExpressionStatement") invalid(file, step, "Use given(), a subject call, or an expect() assertion.");
    const given = directCall(step.expression, helpers.get("given"));
    if (given) {
      if (assertions.length || reference || expectedError) invalid(file, step, "Put given() before the assertions.");
      const [condition] = arity(file, given, 1);
      const predicate = proofPredicate(suite, condition, bindings);
      premises.push(predicate.kind === "boolean"
        ? { kind: "condition", expression: predicate.expression }
        : { kind: "proposition", predicate });
      continue;
    }
    const to = memberCall(step.expression);
    const expect = to && (to.name === "to" || to.name === "toEqual" || to.name === "toThrow") && directCall(to.receiver, helpers.get("expect"));
    if (!to || !expect) invalid(file, step, "Use expect() with to(), toEqual(), or toThrow().");
    const [result] = arity(file, expect, 1);
    const [matcher] = arity(file, to.call, 1);
    if (to.name === "toThrow") {
      if (assertions.length || reference || expectedError || results.size) invalid(file, step, "Use one throw assertion with its call inside expect.");
      if (result?.type !== "ArrowFunctionExpression" || result.async || result.typeParameters || result.params.length || result.body.type === "BlockStatement") {
        invalid(file, result, "Use a parameterless arrow expression for a throwing call.");
      }
      const error = staticString(file, matcher);
      if (!subject.errors?.some(kind => kind === error)) invalid(file, matcher, "Select an exception supported by the configured assistant.");
      observe(readCall(result.body), result);
      expectedError = error as ProofErrorKind;
      continue;
    }
    if (expectedError || reference) invalid(file, step, "Use one outcome per property.");
    const local = result?.type === "Identifier" && results.get(result.name);
    observe(local || readCall(result), result!);
    if (to.name === "toEqual") {
      if (assertions.length) invalid(file, step, "Use toEqual() as the only assertion in its property.");
      if (!subject.callEquality || !subject.inspectCall) invalid(file, step, "The selected assistant does not support equality between calls.");
      reference = readCall(matcher);
      const expected = subject.inspectCall(reference);
      if ((resultType.kind !== "integer" && resultType.kind !== "boolean") || resultType.kind !== expected.kind) {
        invalid(file, matcher, "Use toEqual() with calls returning the same scalar type.");
      }
      continue;
    }
    const clauses = schemaConstraints(suite, matcher, resultType, { kind: "result" }, bindings);
    if (!clauses.length) invalid(file, matcher, "Add a constraint to the result schema.");
    assertions.push(...clauses);
  }
  if (!assertions.length && !reference && !expectedError) invalid(file, property.call, "Add an assertion or use it.todo().");
  const proof = property.proof && nativeTerm(suite, property.proof, emptyBindings);
  return { premises, assertions, proof, ...(observation && { observation }), ...(reference && { reference }), ...(expectedError && { expectedError }) };
}
