import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import type { Node, ObjectExpression, StringLiteral } from "@babel/types";
import type { ReviewedProperty } from "./adapter.ts";
import { invalid, parseSourceModule } from "./source.ts";

interface Subject {
  binding: string;
  source: string;
  subject: string;
  name?: string;
}

export interface RocqDefinition extends Subject {
  proof: string;
  spec?: string;
  property?: ReviewedProperty;
  theorem: string;
}

export interface AutoDefinition extends Subject {
  proof?: undefined;
  theorem?: undefined;
  spec?: undefined;
  property: ReviewedProperty;
  adapter?: { file: string; binding: string };
}
export type ProofDefinition = RocqDefinition | AutoDefinition;
type Imports = Map<string, Pick<ProofDefinition, "source" | "subject">>;

function implementationPath(file: string, specifier: StringLiteral, base: string): string {
  const path = specifier.value;
  if (!/^\.\.?\//.test(path)) invalid(file, specifier, "Import the implementation using a relative path.");
  const direct = resolve(base, path);
  let target = direct;
  let canonical: string;
  try {
    if (!path.endsWith(".ts")) {
      // A sole matching .ts file is unambiguous. Keep its logical path so a retargeted symlink is visible.
      const name = basename(direct);
      const candidates = !extname(name) && !path.endsWith("/") ? readdirSync(dirname(direct)).filter(entry =>
        entry === name || (entry.startsWith(name + ".") && !entry.slice(name.length + 1).includes("."))) : [];
      if (candidates.length === 1 && candidates[0] === name + ".ts") target = direct + ".ts";
      else {
        // Bun caches resolutions in the calling process. Ask a fresh resolver about competing files or directory entries.
        const run = Bun.spawnSync([process.execPath, "--preserve-symlinks", "-e",
          "process.stdout.write(Bun.resolveSync(process.argv[1], process.argv[2]))", path, base], { stderr: "ignore" });
        if (run.exitCode !== 0) throw new Error("Unresolved import");
        target = run.stdout.toString();
      }
    }
    canonical = realpathSync(target);
    if (!statSync(canonical).isFile()) throw new Error("Expected a file");
  }
  catch { return invalid(file, specifier, `Cannot resolve '${path}' from this proof file.`); }
  if (!canonical.endsWith(".ts") || canonical.endsWith(".d.ts")) {
    invalid(file, specifier, `'${path}' resolves to ${canonical}. Pud needs a .ts implementation file.`);
  }
  return target;
}

function literalValue(node: Node): Node {
  while (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") node = node.expression;
  return node;
}

function readProperty(file: string, source: string, node: Node): ReviewedProperty {
  if (node.type !== "ArrowFunctionExpression" || node.async || node.typeParameters) {
    invalid(file, node, "property must be a synchronous arrow function without type parameters.");
  }
  const at = node.loc!.start;
  return {
    file, source: source.slice(node.start!, node.end!), expression: source.slice(node.body.start!, node.body.end!),
    line: at.line, column: at.column, offset: node.start!,
  };
}

interface ManifestInputs {
  origin: string;
  trackImport(path: string, resolveAgain: () => string): void;
}

export function readManifest(file: string, source?: string, inputs?: ManifestInputs): ProofDefinition[] {
  if (!file.endsWith(".proof.ts")) throw new Error(`Expected a *.proof.ts file: ${file}`);
  const origin = inputs?.origin ?? (source === undefined || statSync(file, { throwIfNoEntry: false }) ? realpathSync(file) : resolve(file));
  const base = dirname(origin), manifest = source ?? readFileSync(origin, "utf8");
  const { body } = parseSourceModule(file, manifest);
  const exp = body.at(-1);
  if (exp?.type !== "ExportDefaultDeclaration") {
    invalid(file, exp, "Expected a default export of a proof definition or an array of definitions.");
  }
  const imports: Imports = new Map();
  const helpers = new Set<string>();
  const paths = new Map<string, string>();
  function resolveImport(specifier: StringLiteral) {
    const cached = paths.get(specifier.value);
    if (cached) return cached;
    const resolveAgain = () => implementationPath(file, specifier, base);
    const target = resolveAgain();
    paths.set(specifier.value, target);
    if (!specifier.value.endsWith(".ts")) inputs?.trackImport(target, resolveAgain);
    return target;
  }
  let adapter: AutoDefinition["adapter"];
  for (const imp of body.slice(0, -1)) {
    if (imp.type === "ImportDeclaration" && imp.importKind === "type") continue;
    if (imp.type === "ExportNamedDeclaration" && imp.source && imp.exportKind !== "type" && !adapter && imp.specifiers.length === 1) {
      const spec = imp.specifiers[0]!;
      if (spec.type === "ExportSpecifier" && spec.exportKind !== "type" && spec.local.type === "Identifier" && spec.exported.type === "Identifier" &&
          spec.exported.name === "adapter") {
        adapter = { file: resolveImport(imp.source), binding: spec.local.name };
        continue;
      }
    }
    if (imp.type !== "ImportDeclaration" || !imp.specifiers.length ||
        imp.attributes?.length || imp.phase) {
      invalid(file, imp, "Only named value imports may precede the proof definitions.");
    }
    for (const binding of imp.specifiers) {
      if (binding.type === "ImportSpecifier" && binding.importKind === "type") continue;
      if (binding.type !== "ImportSpecifier" || binding.imported.type !== "Identifier") {
        invalid(file, binding, "Import each subject by name, e.g. import { max, min } from './bounds.ts'.");
      }
      if (imp.source.value === "@pud/cli" && binding.imported.name === "proof") helpers.add(binding.local.name);
      else imports.set(binding.local.name, { source: resolveImport(imp.source), subject: binding.imported.name });
    }
  }
  const value = literalValue(exp.declaration);
  const definitions = value.type === "ArrayExpression" ? value.elements : [value];
  if (!definitions.length) invalid(file, exp, "Expected at least one proof definition.");
  return definitions.map(element => {
    const definition = element && literalValue(element);
    if (definition?.type === "CallExpression" && definition.callee.type === "Identifier" && helpers.has(definition.callee.name)) {
      const [fn, title, predicate] = definition.arguments;
      if (definition.arguments.length !== 3 || fn?.type !== "Identifier" || !imports.has(fn.name) || title?.type !== "StringLiteral" || !predicate) {
        invalid(file, definition, "Use proof(importedFunction, \"property name\", (args, result) => predicate).");
      }
      return { ...imports.get(fn.name)!, binding: fn.name, name: title.value, property: readProperty(file, manifest, predicate), adapter };
    }
    if (definition?.type !== "ObjectExpression") invalid(file, definition ?? exp, "Expected a proof definition using proof() or an object literal.");
    return readDefinition(file, manifest, definition, imports, adapter, base);
  });
}

function readDefinition(file: string, source: string, definition: ObjectExpression, imports: Imports, adapter: AutoDefinition["adapter"], base: string): ProofDefinition {
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
      property = readProperty(file, source, p.value);
    } else {
      if (!["name", "proof", "spec", "theorem"].includes(key) || p.value.type !== "StringLiteral") {
        invalid(file, p, "Expected name, proof, spec and theorem to be literal strings.");
      }
      fields.set(key, p.value.value);
    }
  }
  const { subject: binding, proof, spec, theorem, name } = Object.fromEntries(fields);
  if (!binding) invalid(file, definition, "Required field: subject.");
  if (property ? fields.has("spec") : !spec) invalid(file, definition, "Provide exactly one of property or spec.");
  const subject = { ...imports.get(binding)!, binding, name };
  if (property && !fields.has("proof") && !fields.has("theorem")) return { ...subject, property, adapter };
  if (adapter) invalid(file, definition, "A domain adapter requires an automatic TypeScript property.");
  if (!proof || !theorem) invalid(file, definition, "A linked Rocq proof requires both proof and theorem.");
  if (!/^\.\.?\//.test(proof) || !proof.endsWith(".v")) invalid(file, definition, "proof must be a relative .v file.");
  if (![theorem, ...(spec ? [spec] : [])].every(name => /^[A-Za-z][A-Za-z0-9_]*$/.test(name))) {
    invalid(file, definition, "spec and theorem must be simple Rocq identifiers.");
  }
  return { ...subject, proof: resolve(base, proof), spec, property, theorem };
}
