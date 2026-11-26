/// <reference path="./lean-assets.d.ts" />
import model from "./number.lean" with { type: "text" };
import type { Value } from "./syntax.ts";

export const numberSemantics = model.replace(/^import Std\s*/, "").trimEnd();

export function numberLiteral(value: number): Value {
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setFloat64(0, value);
  return { sort: "number", code: `(JSNumber.ofBits 0x${bytes.getBigUint64(0).toString(16)})` };
}

const arithmetic = { "+": "add", "-": "sub", "*": "mul", "/": "div" } as const;
const comparisons = { "===": "eq", "!==": "eq", "<": "lt", "<=": "le", ">": "lt", ">=": "le" } as const;

export function numberBinary(op: string, lhs: string, rhs: string): Value | undefined {
  if (Object.hasOwn(arithmetic, op)) {
    return { sort: "number", code: `(JSNumber.${arithmetic[op as keyof typeof arithmetic]} ${lhs} ${rhs})` };
  }
  if (Object.hasOwn(comparisons, op)) {
    const args = op === ">" || op === ">=" ? `${rhs} ${lhs}` : `${lhs} ${rhs}`;
    const comparison = `(JSNumber.${comparisons[op as keyof typeof comparisons]} ${args})`;
    return { sort: "boolean", code: op === "!==" ? `(!${comparison})` : comparison };
  }
}
