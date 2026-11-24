import { lean } from "@pud/cli/lean";
import pud from "../pud.config.ts";
import { partsOrEmpty, type Part } from "./content-dispatch.ts";

pud.describe(partsOrEmpty, ({ it, expect }) => {
  it("preserves the parts in order and returns an empty list for text", {
    content: pud.textOrArray(pud.opaque<Part>()),
  }, ({ content }) => {
    expect(partsOrEmpty(content)).to(pud.array(pud.opaque<Part>()).satisfies(lean`(fun (content : Option (List Item)) (parts : List Item) => parts = content.getD []) ${content}`));
  }).by(lean`by
  intro Item content
  cases content <;> rfl`);
});
