import { dirname, resolve } from "node:path";
import type { ArrowFunctionExpression, ObjectExpression } from "@babel/types";
import { invalid, readSourceModule } from "./source.ts";

export interface ReviewedProperty {
  file: string;
  node: ArrowFunctionExpression;
  expression: string;
}

export interface ProofDefinition {
  binding: string;
  source: string;
  subject: string;
  proof: string;
  spec?: string;
  property?: ReviewedProperty;
  theorem: string;
}

type Imports = Map<string, Pick<ProofDefinition, "source" | "subject">>;

export function readManifest(file: string): ProofDefinition[] {
  if (!file.endsWith(".proof.ts")) throw new Error(`Expected a *.proof.ts file: ${file}`);
  const { source: manifest, program } = readSourceModule(file);
  const { body } = program;
  const exp = body.at(-1);
  if (exp?.type !== "ExportDefaultDeclaration") {
    invalid(file, exp, "Expected a default export of a proof definition or an array of definitions.");
  }
  const imports: Imports = new Map();
  for (const imp of body.slice(0, -1)) {
    if (imp.type !== "ImportDeclaration" || imp.importKind === "type" || !imp.specifiers.length ||
        imp.attributes?.length || imp.phase) {
      invalid(file, imp, "Only named value imports may precede the proof definitions.");
    }
    const src = imp.source.value;
    if (!/^\.\.?\//.test(src) || !src.endsWith(".ts") || src.endsWith(".d.ts")) {
      invalid(file, imp.source, "The subject must come from a relative .ts implementation file.");
    }
    const source = resolve(dirname(file), src);
    for (const binding of imp.specifiers) {
      if (binding.type !== "ImportSpecifier" || binding.importKind === "type" || binding.imported.type !== "Identifier") {
        invalid(file, binding, "Import each subject by name, e.g. import { max, min } from './bounds.ts'.");
      }
      imports.set(binding.local.name, { source, subject: binding.imported.name });
    }
  }
  const definitions = exp.declaration.type === "ArrayExpression" ? exp.declaration.elements : [exp.declaration];
  if (!definitions.length) invalid(file, exp, "Expected at least one proof definition.");
  return definitions.map(definition => {
    if (definition?.type !== "ObjectExpression") invalid(file, definition ?? exp, "Each proof definition must be an object literal.");
    return readDefinition(file, manifest, definition, imports);
  });
}

function readDefinition(file: string, source: string, definition: ObjectExpression, imports: Imports): ProofDefinition {
  const fields = new Map<string, string>();
  let property: ReviewedProperty | undefined;
  for (const p of definition.properties) {
    if (p.type !== "ObjectProperty" || p.computed || p.key.type !== "Identifier") {
      invalid(file, p, "Use plain manifest fields.");
    }
    const key = p.key.name;
    if (fields.has(key) || (key === "property" && property)) invalid(file, p, `Duplicate field: ${key}`);
    if (key === "subject") {
      if (p.value.type !== "Identifier" || !imports.has(p.value.name)) {
        invalid(file, p, "subject must reference an imported function.");
      }
      fields.set(key, p.value.name);
    } else if (key === "property") {
      const node = p.value;
      if (node.type !== "ArrowFunctionExpression" || node.async || node.typeParameters || node.body.type === "BlockStatement") {
        invalid(file, node, "property must be a synchronous arrow function with a single predicate expression.");
      }
      property = { file, node, expression: source.slice(node.body.start!, node.body.end!) };
    } else {
      if (!["proof", "spec", "theorem"].includes(key) || p.value.type !== "StringLiteral") {
        invalid(file, p, "Expected proof, spec and theorem to be literal strings.");
      }
      fields.set(key, p.value.value);
    }
  }
  const { subject: binding, proof, spec, theorem } = Object.fromEntries(fields);
  if (!binding || !proof || !theorem) invalid(file, definition, "Required fields: subject, proof, theorem.");
  if (property ? fields.has("spec") : !spec) invalid(file, definition, "Provide exactly one of property or spec.");
  if (!/^\.\.?\//.test(proof) || !proof.endsWith(".v")) invalid(file, definition, "proof must be a relative .v file.");
  if (![theorem, ...(spec ? [spec] : [])].every(name => /^[A-Za-z][A-Za-z0-9_]*$/.test(name))) {
    invalid(file, definition, "spec and theorem must be simple Rocq identifiers.");
  }
  return { ...imports.get(binding)!, binding, proof: resolve(dirname(file), proof), spec, property, theorem };
}
