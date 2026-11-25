import { lean } from "@pud.dev/pud/lean";
import pud from "./pud.config.ts";
import { partsOrEmpty, type Part } from "./content-dispatch.ts";

pud.describe(partsOrEmpty, ({ it, expect, use }) => {
  use(lean.module("./content-dispatch-spec.lean"));

  it("preserves the parts in order and returns an empty list for text", {
    content: pud.textOrArray(pud.opaque<Part>()),
  }, ({ content }) => {
    expect(partsOrEmpty(content)).to(pud.array(pud.opaque<Part>()).satisfies(lean.ref("ContentDispatch.keepsParts", content)));
  });
});
