import { describe, expect, it, lean } from "../authoring.ts";
import { encode } from "./zigzag.ts";

lean.use("./zigzag-spec.lean");

describe(encode, () => {
  it("encodes signed values as nonnegative codes with the correct parity", {
    value: lean.int(),
  }, ({ value }) => {
    expect(encode(value)).to(lean.int().satisfies(lean.ref("ZigZag.represents", value)));
  }).by(lean.inline(`by
  intro value
  simp [ZigZag.represents, impl, Id.run]
  split <;> omega`));
});
