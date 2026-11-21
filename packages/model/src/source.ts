import { parse, parseExpression } from "@babel/parser";
import { readFileSync } from "node:fs";
import { Unsupported } from "./typescript.ts";
import type { ReviewedProperty } from "./adapter.ts";
export { unsupported as invalid } from "./typescript.ts";

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

/** Adapters that use Babel can parse the frozen predicate with its original file locations. */
export function propertyArrow(property: ReviewedProperty) {
  const node = parseExpression(property.source, {
    sourceType: "module", plugins: ["typescript"], startLine: property.line, startColumn: property.column, startIndex: property.offset,
  });
  if (node.type !== "ArrowFunctionExpression") throw new Unsupported(`${property.file}:${property.line}: Expected a property arrow.`);
  return node;
}
