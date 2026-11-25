import { describe, expect, it, pud } from "@pud.dev/lib";
import { highestInteger } from "./math-min-max-int.ts";

describe(highestInteger, () => {
  it("returns one of the three inputs and is at least as large as all of them", {
    a: pud.bigint(),
    b: pud.bigint(),
    c: pud.bigint(),
  }, ({ a, b, c }) => {
    expect(highestInteger(a, b, c)).to(pud.bigint().gte(a).gte(b).gte(c)
      .refine(result => result === a || result === b || result === c));
  });
});
