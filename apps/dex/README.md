# PudDex

The standalone company wiki at `dex.pud.dev`. Open [content](content) as an Obsidian vault. Each Markdown file becomes a page. Folders nest as deeply as you need. Each directory lists the notes in that folder and its descendants. The public build skips dot directories such as `.obsidian` and `.trash`.

## Write

Start a `.md` file anywhere in the vault. The first H1 supplies its title, with the filename as a fallback. The first paragraph supplies its directory description. YAML properties are optional.

```markdown
---
title: A useful reference
author: rorz
date: 2026-11-21
summary: What to read this for.
aliases: [Reference]
tags: [reading]
url: https://example.org/
---

This relates to [[Keeping the context of a link]].
```

Use an author’s handle in the `author` property. PudDex looks up the name and avatar in [authors.json](authors.json) and links the byline to their entries.

Use `date` with a calendar date in `YYYY-MM-DD` format. It appears under the note title and in entry lists.

Use `[[Note]]`, `[[folder/Note|label]]`, `[[Note#Heading]]`, or relative Markdown links such as `[label](../Handbook/Note.md)`. The note page shows its backlinks. Qualify a wikilink with its folder when filenames repeat. An unresolved wikilink appears with a dashed underline.

Write `A claim.[^source]` and add `[^source]: The source for the claim.` on its own line. For a short inline footnote, use `A claim.^[The source for the claim.]`. PudDex numbers footnotes in order of reference and puts them at the bottom of the note, with links back to the text.

Keep images in the vault and refer to them with `![[image.png]]` or `![description](image.png)`. PNG, JPEG, GIF, WebP, and AVIF are supported. The link index gathers HTTP and HTTPS links from note bodies and optional `url` properties, with a link back to every source note.

Files under [content/Bookmarks](content/Bookmarks), including subfolders, appear in the Bookmarks sidebar. A bookmark with a `url` property opens that address directly. Other bookmarks open their Markdown page.

Outbound web links open in a new tab. PudDex fetches one favicon per hostname, maps it to a 16×16 pixel grid and a 16-colour palette, and serves the PNG from the wiki. The build reuses cached icons for a week. When a lookup fails, it uses the last good icon or a small globe.

## Run

Install workspace dependencies with `bun install` at the repository root. From `apps/dex`, run `bun run dev` on port `4902`. Changes to the vault update the local site.

`bun run build` writes static pages to `dist/`. Run `bun run deploy` from this directory with the Cloudflare CLI signed in to publish the site as the `pud-dex` Worker. The deployment serves `dex.pud.dev`.
