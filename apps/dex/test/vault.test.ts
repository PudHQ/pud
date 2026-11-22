import { describe, expect, test } from "bun:test";
import { buildVault } from "../src/lib/vault";

describe("Markdown vault", () => {
  test("author handles come from frontmatter and leave uncredited notes anonymous", () => {
    const vault = buildVault({
      "Log/Entry.md": "---\nauthor: rorz\n---\n# Entry\n\nA note.",
      "Uncredited.md": "A note without properties.",
    });
    expect(vault.notes.map(note => note.author)).toEqual(["rorz", undefined]);
    expect(vault.notes[0].html).toBe("<p>A note.</p>\n");
  });

  test("frontmatter dates keep valid calendar dates and omit invalid values", () => {
    const { notes } = buildVault({
      "Bare.md": "---\ndate: 2026-11-21\n---\nA note.",
      "Impossible.md": "---\ndate: 2025-02-29\n---\nA note.",
      "Quoted.md": "---\ndate: '2024-02-29'\n---\nA note.",
      "Timestamp.md": "---\ndate: 2026-11-21T01:00:00Z\n---\nA note.",
      "Undated.md": "A note.",
    });
    expect(notes.map(note => note.date)).toEqual(["2026-11-21", undefined, "2024-02-29", undefined, undefined]);
  });

  test("nested directories retain their children, full paths and descendant entries", () => {
    const vault = buildVault({
      "Handbook/Overview.md": "# First steps",
      "Handbook/Engineering/Proofs/Overview.md": "# Proofs",
      "Handbook/Engineering/Proofs/Checks.md": "[[Overview]] and [[Handbook/Overview|the handbook]].",
      "Reading.md": "Two choices for [[Overview]].",
      ".obsidian/workspace.md": "Local settings",
      "Handbook/.trash/Old.md": "Deleted note",
    });
    const handbook = vault.roots[0];
    expect(handbook.notes.length).toBe(3);
    const proofs = handbook.children[0].children[0];
    expect(proofs.href).toBe("/folders/handbook/engineering/proofs/");
    expect(proofs.notes.length).toBe(2);
    expect(vault.notes).toHaveLength(4);
    const checks = vault.notes.find(note => note.title === "Checks")!;
    expect(checks.html).toContain('href="/notes/handbook/engineering/proofs/overview/"');
    expect(checks.html).toContain('href="/notes/handbook/overview/">the handbook');
    expect(vault.notes.find(note => note.title === "Reading")!.html).toContain('class="unresolved"');
  });

  test("relative Markdown links, wikilinks, aliases and headings share one backlink graph", () => {
    const vault = buildVault({
      "A/Proof note.md": "---\naliases: [Witness]\n---\n# Proof note\n\n## Read this\n\nSee [[#Read this]].",
      "B/Source.md": "# Source\n\n[[Witness#Read this|The witness]] and [again](../A/Proof%20note.md#Read%20this).",
      "Example.md": "`[[Witness]]`\n\n```md\n[[Witness]]\n```\n\n\\[\\[Witness]]",
    });
    const proof = vault.notes.find(note => note.title === "Proof note")!;
    expect(proof.backlinks.map(note => note.title)).toEqual(["Source"]);
    expect(proof.html).toContain('id="read-this"');
    expect(proof.html).toContain('href="#read-this"');
    const source = vault.notes.find(note => note.title === "Source")!;
    expect(source.html.match(/href="\/notes\/a\/proof-note\/#read-this"/g)).toHaveLength(2);
  });

  test("outbound Markdown links share a favicon per host and open in a new tab", () => {
    const vault = buildVault({
      "Home.md": "[One](https://www.example.org/a?q=1) and [two](//www.example.org/b). [[Other]] and [here](https://dex.pud.dev/).",
      "Other.md": "A local note.",
    });
    const html = vault.notes[0].html;
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2);
    const icons = html.match(/\/favicons\/[a-f0-9]+\.png/g);
    expect(icons).toHaveLength(2);
    expect(new Set(icons).size).toBe(1);
    expect(html).toContain('<a href="/notes/other/">Other</a>');
    expect(html).toContain('<a href="https://dex.pud.dev/">here</a>');
    expect(vault.links).toContainEqual(expect.objectContaining({ href: "https://www.example.org/b" }));
  });

  test("footnotes follow reference order and link back to each occurrence", () => {
    const vault = buildVault({
      "Entry.md": [
        "First.[^source] Second.[^other] Repeated.[^source]",
        "[^other]: Defined first.",
        "[^source]: Read [[Guide]] and [the manual](https://example.org/manual).",
        "    A **second paragraph**.",
      ].join("\n\n"),
      "Guide.md": "A local note.",
    });
    const [entry, guide] = vault.notes;
    expect(entry.summary).toBe("First. Second. Repeated.");
    expect(entry.html).toContain('href="#fn:1" id="fnref:1:1"');
    expect(entry.html).toContain('href="#fn:2" id="fnref:2:1"');
    expect(entry.html).toContain('href="#fn:1" id="fnref:1:2" aria-label="Footnote 1">[1]');
    expect(entry.html).toContain('id="fn:1" class="footnote-item"');
    expect(entry.html).toContain('id="fn:2" class="footnote-item"');
    for (const id of ["fnref:1:1", "fnref:2:1", "fnref:1:2"]) {
      expect(entry.html).toContain(`href="#${id}" class="footnote-backref"`);
    }
    expect(entry.html.indexOf("Read <a")).toBeLessThan(entry.html.indexOf("Defined first."));
    expect(entry.html).toContain("A <strong>second paragraph</strong>.");
    expect(entry.html).toContain('<a href="/notes/guide/">Guide</a>');
    expect(guide.backlinks).toEqual([entry]);
    expect(vault.links[0]).toMatchObject({ href: "https://example.org/manual", sources: [entry] });
  });

  test("a footnote in the title keeps its return link and stays out of the directory", () => {
    const { notes: [note] } = buildVault({
      "Entry.md": "# Fn1[^title]\n\n## Fnref1\n\n[^title]: A title footnote.",
    });
    expect(note.title).toBe("Fn1");
    expect(note.headingId).toBe("fn1");
    expect(note.summary).toBe("");
    expect(note.titleFootnotes).toContain('href="#fn:1" id="fnref:1:1"');
    expect(note.html).toContain('<h2 id="fnref1">Fnref1</h2>');
    expect(note.html).toContain('href="#fnref:1:1" class="footnote-backref"');
  });

  test("inline footnotes render while code, escaped markers and missing references stay literal", () => {
    const { notes: [inline, literal] } = buildVault({
      "Inline.md": "An inline footnote.^[With *emphasis*.]\n\nAlso used.[^shared]\n\n[^shared]: A definition.",
      "Literal.md": "Code `[^unused]`, escaped \\[^unused], missing [^shared].\n\n```md\n[^unused]\n```\n\n[^unused]: Unused.",
    });
    expect(inline.html).toContain("With <em>emphasis</em>.");
    expect(literal.html).toContain("<code>[^unused]</code>, escaped [^unused], missing [^shared].");
    expect(literal.html).toContain('<pre><code class="language-md">[^unused]\n</code></pre>');
    expect(literal.html).not.toContain('class="footnotes"');
  });

  test("one bookmark retains all sources, and images resolve from inside the vault", () => {
    const vault = buildVault({
      "Bookmarks/A link.md": "---\nurl: https://example.com\n---\n# A link\n\nSaved for later.",
      "Ideas/A drawing.md": "https://example.com and [its homepage](https://example.com/).\n\n![[Sketch.png]]\n\n![Draft](../Art/Sketch.png)",
    }, { "Art/Sketch.png": "/assets/sketch.png" });
    expect(vault.links).toHaveLength(1);
    expect(vault.links[0].sources.map(note => note.title)).toEqual(["A drawing", "A link"]);
    expect(vault.notes[0].html.match(/src="\/assets\/sketch.png"/g)).toHaveLength(2);
    expect(vault.notes[1].summary).toBe("Saved for later.");
  });

  test("bookmarks appear in the folder tree and the full entry list", () => {
    const vault = buildVault({
      "Bookmarks/Tools/Manual.md": "---\nurl: https://manual.example/\n---\n# Manual",
      "Bookmarks/Reading list.md": "# Reading list",
      "Handbook/Bookmarks/Guide.md": "Read [[Manual]] and [this reference](https://reference.example/).",
    });
    const [bookmarks, handbook] = vault.roots;
    expect(bookmarks.href).toBe("/folders/bookmarks/");
    expect(bookmarks.notes.map(note => note.title)).toEqual(["Manual", "Reading list"]);
    expect(bookmarks.children.map(folder => folder.name)).toEqual(["Tools"]);
    expect(handbook.children[0].href).toBe("/folders/handbook/bookmarks/");
    expect(vault.notes.map(note => note.title)).toEqual(["Guide", "Manual", "Reading list"]);
    expect(vault.notes[0].html).toContain('href="/notes/bookmarks/tools/manual/"');
    expect(vault.links.map(link => link.host).sort()).toEqual(["manual.example", "reference.example"]);
  });

  test("an empty vault works and colliding public URLs identify both files", () => {
    expect(buildVault({}).roots).toEqual([]);
    expect(() => buildVault({ "Déjà vu.md": "One", "Déjà-vu.md": "Two" })).toThrow("Déjà-vu.md");
  });
});
