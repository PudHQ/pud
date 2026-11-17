import { max, min } from "./bounds.ts";

export default [
  { subject: max, proof: "./Maximum.v", spec: "maximum", theorem: "max_correct" },
  { subject: min, proof: "./Minimum.v", spec: "minimum", theorem: "min_correct" },
];
