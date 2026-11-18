import { parse } from "@babel/parser";
import type { Node } from "@babel/types";
import { readFileSync } from "node:fs";

export function readSourceModule(file: string) {
  const source = readFileSync(file, "utf8");
  try {
    const { program } = parse(source, { sourceType: "module", plugins: ["typescript"] });
    return { source, program };
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : error}`);
  }
}

export function invalid(file: string, node: Node | undefined, message: string): never {
  const loc = node?.loc?.start;
  throw new Error(`${file}${loc ? `:${loc.line}:${loc.column + 1}` : ""}: ${message}`);
}
