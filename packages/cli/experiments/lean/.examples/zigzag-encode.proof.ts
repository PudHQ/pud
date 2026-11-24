import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { encode } from "./zigzag.ts";

pud.describe(encode, ({ it, expect, use }) => {
  use(lean.module("./zigzag-spec.lean"));

  it("encodes signed values as nonnegative codes with the correct parity", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(encode(value)).to(pud.bigint().satisfies(lean.ref("ZigZag.represents", value)));
  });
});
