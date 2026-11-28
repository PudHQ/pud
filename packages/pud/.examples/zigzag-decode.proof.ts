import { lean } from "pud.dev/lean";
import pud from "./pud.config.ts";
import { decode } from "./zigzag.ts";

pud.describe(decode, ({ it, expect, use }) => {
  use(lean.module("./zigzag-spec.lean"));

  it("returns the signed integer represented by a nonnegative code", {
    code: pud.bigint().gte(0n),
  }, ({ code }) => {
    expect(decode(code)).to(pud.bigint().satisfies(lean.ref("ZigZag.decodesTo", code)));
  });
});
