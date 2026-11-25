import { describe, expect, it, pud } from "@pud.dev/pud";
import { decode, encode } from "./zigzag.ts";

describe(encode, () => {
  it("decodes an encoded signed integer back to itself", { value: pud.bigint() }, ({ value }) => {
    expect(decode(encode(value))).to(pud.bigint().eq(value));
  });
});
