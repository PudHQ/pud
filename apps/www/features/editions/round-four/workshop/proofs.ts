import { fixtureRoot } from "../../remix/bench-ui";

export const assets = "/editions/round-four/workshop/";
export const focus = "focus-visible:outline-3 focus-visible:outline-offset-3";
export const tickets = [
  {
    file: "clamp",
    name: "clamp",
    claim: "Keeps the result between ordered bounds.",
    status: "proved",
    detail: "1 property proved.",
    line: 5,
  },
  {
    file: "sum-positive",
    name: "sumPositive",
    claim: "Returns a nonnegative total for every input list.",
    status: "unsupported",
    detail: "sum-positive.ts:4:3: Unsupported statement 'ForStatement' before the final return.",
    line: 8,
  },
  {
    file: "debit",
    name: "debit",
    claim: "Deducts an affordable positive charge in full.",
    status: "proved",
    detail: "2 properties proved.",
    line: 12,
  },
  {
    file: "safe-quotient",
    name: "divideOrZero",
    claim: "Catches division by zero and returns zero.",
    status: "proved",
    detail: "2 properties proved.",
    line: 12,
  },
] as const;

export function proofLink(file: string) {
  return `${fixtureRoot}${file}.proof.ts`;
}
