import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { numCond } from "./truthiness.ts";

pud.describe(numCond, ({ it, expect }) => {
  it("converts zero to zero and every nonzero bigint to one", {
    value: pud.bigint(),
  }, ({ value }) => {
    expect(numCond(value)).to(pud.bigint().satisfies(lean`(fun (value result : Int) => result = if value = 0 then 0 else 1) ${value}`));
  });
});
