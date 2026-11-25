import type { Node, Program } from "@babel/types";
import type { SubjectSource } from "../assistant.ts";
import { selectSubject } from "../module.ts";
import { invalid, parseSourceModule, resolveTypeScriptImport } from "../source.ts";
import { dirname } from "node:path";
import { lowerFunction, type Subject } from "./subject.ts";

interface Module {
  file: string;
  program: Program;
  declarations: Program;
  imports: Map<string, { owner: Module; name: string }>;
}

/** Link source functions only after validating module initialization and binding identities. */
export function lowerProgram(source: SubjectSource) {
  const modules = new Map<string, Module>();
  const loading = new Set<string>();
  const functions = new Map<Module, Map<string, Subject>>();
  const compiling = new Map<Module, Set<string>>();
  let nextFunction = 0;

  function load(file: string, contents: string): Module {
    if (loading.has(file)) invalid(file, undefined, "Cyclic runtime imports are outside the Lean model.");
    const cached = modules.get(file);
    if (cached) return cached;
    loading.add(file);
    try {
      const program = parseSourceModule(file, contents);
      const module: Module = { file, program, declarations: { ...program, body: [] }, imports: new Map() };
      for (const node of program.body) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type") {
          module.declarations.body.push(node);
          continue;
        }
        if (!source.readModule || node.attributes?.length || node.phase || !node.specifiers.length ||
            !node.specifiers.some(spec => spec.type === "ImportSpecifier" && spec.importKind !== "type")) {
          invalid(file, node, "Use named TypeScript function imports from modules with inert initialization.");
        }
        const resolveAgain = () => resolveTypeScriptImport(file, node.source, dirname(file));
        const dependency = source.readModule(resolveAgain(), resolveAgain);
        const owner = load(dependency.canonical, dependency.source);
        for (const spec of node.specifiers) {
          if (spec.type !== "ImportSpecifier" || spec.imported.type !== "Identifier") {
            invalid(file, spec, "Use a named function import.");
          }
          if (spec.importKind === "type") continue;
          const name = spec.imported.name;
          selectSubject(owner.declarations, owner.file, name, { allowArrowFunctions: true });
          module.imports.set(spec.local.name, { owner, name });
        }
      }
      modules.set(file, module);
      functions.set(module, new Map());
      compiling.set(module, new Set());
      return module;
    } finally { loading.delete(file); }
  }

  function link(module: Module, name: string, exported = false): Subject {
    const done = functions.get(module)!;
    const cached = done.get(name);
    if (cached) {
      if (exported) selectSubject(module.declarations, module.file, name, { allowArrowFunctions: true });
      return cached;
    }
    const pending = compiling.get(module)!;
    if (pending.has(name)) invalid(module.file, undefined, "Mutually recursive calls are outside the Lean model.");
    pending.add(name);
    try {
      const fn = selectSubject(module.declarations, module.file, name, { allowArrowFunctions: true, allowLocalFunctions: !exported });
      const code = exported && module === owner && name === source.name ? "impl" : `fn${nextFunction++}`;
      const subject = lowerFunction(module.file, module.program, fn, name, code, (callee: string, at: Node) => {
        const imported = module.imports.get(callee);
        if (imported) return link(imported.owner, imported.name, true);
        if (pending.has(callee)) invalid(module.file, at, "Mutually recursive calls are outside the Lean model.");
        return link(module, callee);
      });
      done.set(name, subject);
      return subject;
    } finally { pending.delete(name); }
  }

  const owner = load(source.file, source.source);
  const root = link(owner, source.name, true);
  return {
    root,
    resolve(file: string, name: string) {
      if (file === owner.file) return link(owner, name, true);
      if (!source.readModule) invalid(file, undefined, "Linking another export needs a source snapshot.");
      const dependency = source.readModule(file);
      return link(load(dependency.canonical, dependency.source), name, true);
    },
  };
}

export function definitions(roots: readonly Subject[]) {
  const ordered = new Set<Subject>();
  function add(subject: Subject) {
    if (ordered.has(subject)) return;
    for (const callee of subject.callees) add(callee);
    ordered.add(subject);
  }
  for (const root of roots) add(root);
  return [...ordered];
}
