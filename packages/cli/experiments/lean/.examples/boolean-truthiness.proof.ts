import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { boolCond } from "./truthiness.ts";

pud.describe(boolCond, ({ it, expect }) => {
  it("converts true to one and false to zero", {
    value: pud.boolean(),
  }, ({ value }) => {
    expect(boolCond(value)).to(pud.bigint().satisfies(lean`(fun (value : Bool) (result : Int) => result = if value then 1 else 0) ${value}`));
  });
});
