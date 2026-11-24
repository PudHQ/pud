import { parse, parseExpression } from "@babel/parser";
import type { StringLiteral } from "@babel/types";
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { Unsupported, unsupported as invalid } from "./typescript.ts";
import type { ReviewedProperty } from "./adapter.ts";
export { invalid };

export function readSourceModule(file: string) {
  const source = readFileSync(file, "utf8");
  return { source, program: parseSourceModule(file, source) };
}

export function parseSourceModule(file: string, source: string) {
  try {
    const { program } = parse(source, { sourceType: "module", plugins: ["typescript"] });
    return program;
  } catch (error) {
    throw new Unsupported(`${file}: ${error instanceof Error ? error.message : error}`);
  }
}

export function resolveTypeScriptImport(file: string, specifier: StringLiteral, base: string): string {
  const path = specifier.value;
  if (!/^\.\.?\//.test(path)) invalid(file, specifier, "Import the implementation using a relative path.");
  const direct = resolve(base, path);
  let target = direct;
  let canonical: string;
  try {
    if (!path.endsWith(".ts")) {
      // A sole matching .ts file is unambiguous. Keep the logical path to see symlink retargeting.
      const name = basename(direct);
      const candidates = !extname(name) && !path.endsWith("/") ? readdirSync(dirname(direct)).filter(entry =>
        entry === name || (entry.startsWith(name + ".") && !entry.slice(name.length + 1).includes("."))) : [];
      if (candidates.length === 1 && candidates[0] === name + ".ts") target = direct + ".ts";
      else {
        // Resolve competing files or directories in a fresh Bun process.
        const run = Bun.spawnSync([process.execPath, "--preserve-symlinks", "-e",
          "process.stdout.write(Bun.resolveSync(process.argv[1], process.argv[2]))", path, base], { stderr: "ignore" });
        if (run.exitCode !== 0) throw new Error("Unresolved import");
        target = run.stdout.toString();
      }
    }
    canonical = realpathSync(target);
    if (!statSync(canonical).isFile()) throw new Error("Expected a file");
  } catch {
    return invalid(file, specifier, `Cannot resolve '${path}' from this proof file.`);
  }
  if (!canonical.endsWith(".ts") || canonical.endsWith(".d.ts")) {
    invalid(file, specifier, `'${path}' resolves to ${canonical}. Pud needs a .ts implementation file.`);
  }
  return target;
}

/** Adapters that use Babel can parse the frozen predicate with its original file locations. */
export function propertyArrow(property: ReviewedProperty) {
  const node = parseExpression(property.source, {
    sourceType: "module", plugins: ["typescript"], startLine: property.line, startColumn: property.column, startIndex: property.offset,
  });
  if (node.type !== "ArrowFunctionExpression") throw new Unsupported(`${property.file}:${property.line}: Expected a property arrow.`);
  return node;
}
