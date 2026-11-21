/** Values and control flow shared by frontends and proof backends. */
export type Sort = "integer" | "boolean" | "string";
export type BinaryOp = "+" | "-" | "*" | "<" | "<=" | ">" | ">=" | "===" | "!==" | "&&" | "||";
export type Expr =
  | { kind: "integer"; sort: "integer"; value: string }
  | { kind: "boolean"; sort: "boolean"; value: boolean }
  | { kind: "string"; sort: "string"; value: string }
  | { kind: "reference"; sort: Sort; path: string[] }
  | { kind: "unary"; sort: Sort; op: "!" | "-"; arg: Expr }
  | { kind: "binary"; sort: Sort; op: BinaryOp; left: Expr; right: Expr }
  | { kind: "let"; sort: Sort; name: string; value: Expr; body: Expr }
  | { kind: "choose"; sort: Sort; test: Expr; yes: Expr; no: Expr };

export const integer = (value: bigint): Expr => ({ kind: "integer", sort: "integer", value: value.toString() });
export const bool = (value: boolean): Expr => ({ kind: "boolean", sort: "boolean", value });
export const string = (value: string): Expr => ({ kind: "string", sort: "string", value });
export const ref = (sort: Sort, ...path: string[]): Expr => ({ kind: "reference", sort, path });

export function unary(op: "!" | "-", arg: Expr): Expr {
  const sort = op === "!" ? "boolean" : "integer";
  if (arg.sort !== sort) throw new Error(`${op} expects ${sort === "integer" ? "bigint" : sort} operands.`);
  return { kind: "unary", sort, op, arg };
}

export function binary(op: BinaryOp, left: Expr, right: Expr): Expr {
  const input = op === "===" || op === "!==" ? left.sort : op === "&&" || op === "||" ? "boolean" : "integer";
  if (left.sort !== input || right.sort !== input) throw new Error(`${op} expects ${input === "integer" ? "bigint" : input} operands.`);
  const sort = op === "+" || op === "-" || op === "*" ? "integer" : "boolean";
  return { kind: "binary", sort, op, left, right };
}

export function choose(test: Expr, yes: Expr, no: Expr): Expr {
  if (test.sort !== "boolean" || yes.sort !== no.sort) throw new Error("A conditional needs a boolean test and two branches of the same type.");
  return { kind: "choose", sort: yes.sort, test, yes, no };
}

/** A step is supplied by the consuming domain, e.g. a database operation. */
export type Statement<Effect, Result = Expr> =
  | { kind: "let"; name: string; value: Expr }
  | { kind: "if"; test: Expr; yes: Statement<Effect, Result>[]; no: Statement<Effect, Result>[] }
  | { kind: "return"; value: Result }
  | { kind: "effect"; effect: Effect };

/** The value returned by a pure block. A missing value means some path falls through. */
export function returnedExpression(statements: readonly Statement<never>[]): Expr | undefined {
  let serial = 0;
  const bind = (name: string, value: Expr, body: Expr): Expr => ({ kind: "let", name, value, body, sort: body.sort });
  function block(statements: readonly Statement<never>[], tail?: Expr): Expr | undefined {
    let next = tail;
    for (let i = statements.length - 1; i >= 0; i--) {
      const s = statements[i]!;
      switch (s.kind) {
        case "return": next = s.value; break;
        case "let": if (next) next = bind(s.name, s.value, next); break;
        case "if": {
          // Name the shared tail once so a sequence of branches grows linearly.
          const name = `pud_next${serial++}`;
          const tail = next && ref(next.sort, name);
          const yes = block(s.yes, tail), no = block(s.no, tail);
          if (!yes || !no) { next = undefined; break; }
          const value = choose(s.test, yes, no);
          next = next ? bind(name, next, value) : value;
          break;
        }
        case "effect": throw new Error("An effect cannot appear in a pure expression.");
      }
    }
    return next;
  }
  return block(statements);
}
