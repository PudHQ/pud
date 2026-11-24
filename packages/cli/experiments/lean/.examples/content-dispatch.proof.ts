import { describe, expect, it, lean } from "../authoring.ts";
import { partsOrEmpty, type Part } from "./content-dispatch.ts";

describe(partsOrEmpty, () => {
  it("preserves the parts in order and returns an empty list for text", {
    content: lean.textOrArray(lean.opaque<Part>()),
  }, ({ content }) => {
    expect(partsOrEmpty(content)).to(lean.array(lean.opaque<Part>()).satisfies(lean.inline(
      "fun (content : Option (List Item)) (parts : List Item) => parts = content.getD []",
      content,
    )));
  }).by(lean.inline(`by
  intro Item content
  cases content <;> rfl`));
});
