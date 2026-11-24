# PudDex

The standalone company wiki at `dex.pud.dev`. Open [content](content) as an Obsidian vault. Each Markdown file becomes a page. Folders nest as deeply as you need. Each directory lists the notes in that folder and its descendants. The public build skips dot directories such as `.obsidian` and `.trash`.

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run dev:dex` from the root. Changes to the vault update the local site.

## Release

Run `bun run build:dex` from the root to generate static pages in `apps/dex/dist`. Run `bun run deploy:dex` to build and publish those assets to the `pud-dex` Worker.

## Write

Start a `.md` file in the vault. The title comes from `title`, the first H1, or the filename, in that order. The directory shows `summary` when present and otherwise uses the first paragraph outside a warning callout. YAML properties are optional.

The Handbook explains Pud’s behavior and working workflows. The First Mate’s Log collects agent experiments, work updates, and lessons in topic folders, with dates in each entry’s frontmatter. [Adding to PudDex](content/Handbook/adding-to-puddex.md) · [First Mate’s Log](<content/First Mate's Log/about-the-first-mates-log.md>)

```markdown
---
title: A useful reference
author: rorz
date: 2026-11-21
updated-at: 2026-11-24
summary: What to read this for.
aliases: [Reference]
tags: [reading]
url: https://example.org/
---

This relates to [[Keeping the context of a link]].
```

Use an author’s handle in the `author` property. PudDex looks up the name and avatar in [authors.json](authors.json) and links the byline to their entries.

Use `date` with a calendar date in `YYYY-MM-DD` format. It appears under the note title and in entry lists. When you revise a note, set `updated-at` in the same format to show the revision date under its title.

Put the `> [!WARNING]` callout below the H1 of an agent-authored note. Use the wording in the [PudDex notes skill](../../skills/puddex-notes/SKILL.md).

Use `[[Note]]`, `[[folder/Note|label]]`, `[[Note#Heading]]`, or relative Markdown links such as `[label](../Handbook/Note.md)`. The note page shows its backlinks. Qualify a wikilink with its folder when filenames repeat. An unresolved wikilink appears with a dashed underline.

Write `A claim.[^source]` and add `[^source]: The source for the claim.` on its own line. For a short inline footnote, use `A claim.^[The source for the claim.]`. PudDex numbers footnotes in order of reference and puts them at the bottom of the note, with links back to the text.

Keep images in the vault and refer to them with `![[image.png]]` or `![description](image.png)`. PNG, JPEG, GIF, WebP, and AVIF are supported. The link index gathers HTTP and HTTPS links from note bodies and optional `url` properties, with a link back to every source note.

Files under [content/Bookmarks](content/Bookmarks), including subfolders, appear in the Bookmarks folder under Entries. The note page shows a Visit link when the note has a `url` property.

Outbound web links open in a new tab. PudDex fetches one favicon per hostname, maps it to a 16×16 pixel grid and a 16-colour palette, and serves the PNG from the wiki. The build reuses cached icons for a week. When a lookup fails, it uses the last good icon or a small globe.
