---
name: puddex-notes
description: Write and maintain PudDex Handbook guides and topical First Mate’s Log entries when work yields useful findings or references.
---
# Record findings in PudDex

Before finishing, record useful findings and anything that took substantive work to establish in `apps/dex/content`. Search for the topic first and extend a note that already covers it. [PudDex writing guide](../../../apps/dex/README.md#write)

## Handbook

Write a Handbook note when you can explain a concrete facet of Pud in depth or walk a reader through a working Pud workflow. Lead with the question it answers. Check claims about behavior against the implementation, a test, or a runnable example. Explain how the behavior matters to the reader and where its guarantees apply. Link the sources and the related Handbook notes that answer the reader’s next question.

## First Mate’s Log

Use `First Mate's Log/` for agent work updates, experiments, measurements, design trials, and open questions. File entries in subject folders with descriptive filenames, such as `First Mate's Log/Verification/Lean/random-lemmascript-examples.md`. Put dates in frontmatter. Record what you tried, what happened, and what the result taught you. Link the evidence and any relevant Handbook guide. When an experiment yields a durable explanation or a verified workflow, document it in the Handbook and link back to the experiment.

When you add, edit, move, or remove a First Mate’s Log entry, record one bullet per affected note in [CHANGES.md](<../../../apps/dex/content/First Mate's Log/CHANGES.md>). Say what changed and link to the note when available. Use calendar dates in `YYYY-MM-DD` headings with the latest date first, and set the changelog’s `updated-at` to the latest entry date when revising it.

## Maintain existing notes

When new evidence or a better reference bears on an existing note, revise the relevant passage in place. Link the new source where it supports the claim and correct any claims the evidence changes. Keep the original `date` and set `updated-at` to the revision date in `YYYY-MM-DD` format. Use Git for edit history.

## Write for the next reader

Follow the vault’s topic folders and naming conventions. Use a descriptive H1 and set `summary`, `tags`, and `date` in YAML frontmatter. Use focused tags and the author’s handle, such as `codex` for Codex. Include the scope, version, and assumptions a reader needs to interpret or reproduce the result. Use vault wikilinks for related notes and details suitable for PudDex’s public build.

## Disclose agent authorship

Every note created by an agent must begin with this callout immediately below the H1. Small edits to a human-authored note preserve its existing authorship.

```markdown
> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.
```
