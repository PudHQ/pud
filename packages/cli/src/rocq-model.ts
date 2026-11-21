import type { Expr, Sort } from "@pud/model";
import type { Model } from "./translate.ts";

const types: Record<Sort, string> = { integer: "Z", boolean: "bool", string: "string" };
const ops = { "+": "Z.add", "-": "Z.sub", "*": "Z.mul", "<": "Z.ltb", "<=": "Z.leb", ">": "Z.gtb", ">=": "Z.geb", "&&": "andb", "||": "orb" };

function expression(e: Expr): string {
  switch (e.kind) {
    case "integer": return `(${e.value}%Z)`;
    case "boolean": return String(e.value);
    case "string": throw new Error("Rocq strings are outside the pure fragment.");
    case "reference": return e.path.join(".");
    case "let": return `(let ${e.name} := ${expression(e.value)} in ${expression(e.body)})`;
    case "unary": return `(${e.op === "!" ? "negb" : "Z.opp"} ${expression(e.arg)})`;
    case "choose": return `(if ${expression(e.test)} then ${expression(e.yes)} else ${expression(e.no)})`;
    case "binary": {
      const args = `${expression(e.left)} ${expression(e.right)}`;
      if (e.op === "===" || e.op === "!==") {
        const eq = `(${e.left.sort === "integer" ? "Z.eqb" : "Bool.eqb"} ${args})`;
        return e.op === "!==" ? `(negb ${eq})` : eq;
      }
      return `(${ops[e.op]} ${args})`;
    }
  }
}

export function subjectModule({ params, result, returned, property }: Model): string {
  const binders = params.map(p => `(${p.name} : ${types[p.sort]})`);
  const args = params.map(p => p.name);
  const signature = [...params.map(p => types[p.sort]), types[result]].join(" -> ");
  const forall = binders.length ? `forall ${binders.join(" ")}, ` : "";
  const application = ["impl", ...args].join(" ");
  const predicateHead = ["property", ...binders, `(result : ${types[result]})`].join(" ");
  const predicateCall = ["property", ...args, `(${application})`].join(" ");
  return [
    "From Stdlib Require Import ZArith Bool.", "",
    `Definition ${["impl", ...binders].join(" ")} : ${types[result]} := ${expression(returned)}.`, "",
    ...(property ? [
      `Definition ${predicateHead} : bool := ${expression(property)}.`, "",
      "Definition claim : Prop :=", `  ${forall}${predicateCall} = true.`,
    ] : [
      `Definition agrees (spec : ${signature}) : Prop :=`,
      `  ${forall}${application} = ${["spec", ...args].join(" ")}.`,
    ]), "",
  ].join("\n");
}
