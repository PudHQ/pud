import { max, min } from "./bounds.ts";

export default [
  {
    subject: max,
    property: (a: bigint, b: bigint, r: bigint) => r >= a && r >= b && (r === a || r === b),
    proof: "./Maximum.v",
    theorem: "max_correct",
  },
  { subject: min, proof: "./Minimum.v", spec: "minimum", theorem: "min_correct" },
];
