import { traverseFast, type ArrowFunctionExpression, type FunctionDeclaration, type Node, type Program } from "@babel/types";
import { unsupported as invalid } from "./typescript.ts";

type SubjectFunction = FunctionDeclaration | ArrowFunctionExpression;

function literalInitializer(node: Node | null | undefined): boolean {
  if (!node) return false;
  switch (node.type) {
    case "StringLiteral":
    case "NumericLiteral":
    case "BooleanLiteral":
    case "BigIntLiteral":
    case "NullLiteral":
      return true;
    case "TemplateLiteral":
      return node.expressions.length === 0;
    case "UnaryExpression":
      return node.operator === "-" && (node.argument.type === "BigIntLiteral" || node.argument.type === "NumericLiteral");
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
      return literalInitializer(node.expression);
    default:
      return false;
  }
}

function writesBinding(target: Node, name: string): boolean {
  switch (target.type) {
    case "Identifier":
      return target.name === name;
    case "MemberExpression":
    case "OptionalMemberExpression":
    case "VariableDeclaration": // A declaration in a sibling's for-in/of creates a local binding.
      return false;
    case "ObjectPattern":
      return target.properties.some(p => writesBinding(p.type === "RestElement" ? p.argument : p.value, name));
    case "ArrayPattern":
      return target.elements.some(item => item !== null && writesBinding(item, name));
    case "RestElement":
      return writesBinding(target.argument, name);
    case "AssignmentPattern":
      return writesBinding(target.left, name);
    case "ParenthesizedExpression":
    case "TSAsExpression":
    case "TSInstantiationExpression":
    case "TSNonNullExpression":
    case "TSSatisfiesExpression":
    case "TSTypeAssertion":
      return writesBinding(target.expression, name);
    default:
      return true; // An unfamiliar write target needs review before we can admit it.
  }
}

// A callable sibling must not be able to replace the exported binding after verification.
function checkSibling(file: string, fn: SubjectFunction, subject: string) {
  const hasLocalParameter = fn.params.some(p => p.type === "Identifier" && p.name === subject);
  traverseFast(fn, node => {
    if (node.type === "Identifier" && node.name === "eval") {
      invalid(file, node, "Cannot verify a function alongside code that may evaluate dynamic JavaScript.");
    }
    const target = node.type === "UpdateExpression" ? node.argument
      : node.type === "AssignmentExpression" || node.type === "ForOfStatement" || node.type === "ForInStatement" ? node.left
      : undefined;
    if (target && !hasLocalParameter && writesBinding(target, subject)) {
      invalid(file, target, `Another function may reassign the verified binding '${subject}'.`);
    }
  });
}

type FunctionOptions = { allowArrowFunctions: true; allowLocalFunctions?: boolean };

export function selectSubject(program: Program, file: string, name: string): FunctionDeclaration;
export function selectSubject(program: Program, file: string, name: string, options: FunctionOptions): SubjectFunction;
export function selectSubject(program: Program, file: string, name: string, options?: FunctionOptions): SubjectFunction {
  let fn: SubjectFunction | undefined;
  for (const stmt of program.body) {
    if (stmt.type === "ImportDeclaration" && stmt.importKind === "type") continue;
    if ((stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportAllDeclaration") && stmt.exportKind === "type") continue;
    const exported = stmt.type === "ExportNamedDeclaration";
    const selectable = exported || options?.allowLocalFunctions;
    const decl = exported ? stmt.declaration : stmt;
    if (decl?.type === "FunctionDeclaration") {
      if (selectable && decl.id?.name === name) fn = decl;
      else checkSibling(file, decl, name);
      continue;
    }
    if (decl?.type === "TSInterfaceDeclaration" || decl?.type === "TSTypeAliasDeclaration") continue;
    if (decl?.type === "VariableDeclaration" && decl.kind === "const" && !decl.declare) {
      for (const d of decl.declarations) {
        if (d.id.type === "Identifier" && literalInitializer(d.init)) continue;
        if (d.id.type !== "Identifier" || !options?.allowArrowFunctions || d.init?.type !== "ArrowFunctionExpression") {
          invalid(file, d, "Subject modules may contain only named functions, type-only declarations, or constants with supported initializers.");
        }
        if (selectable && d.id.name === name) {
          if (d.id.typeAnnotation) invalid(file, d.id, "Declare parameter and return types on the arrow function itself.");
          fn = d.init;
        } else checkSibling(file, d.init, name);
      }
      continue;
    }
    invalid(file, stmt, "Subject modules may contain only named functions, type-only declarations, or constants with supported initializers.");
  }
  if (!fn) {
    if (options?.allowLocalFunctions) return invalid(file, undefined, `Expected a directly declared function named '${name}'.`);
    throw new Error(`${file}: No named function export '${name}'.`);
  }
  return fn;
}
