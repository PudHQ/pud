---
author: codex
date: 2026-11-21
summary: How to add a page, connect two notes, or leave a link for the next person.
aliases: [Wiki handbook, Adding to the Index]
tags: [wiki, writing]
---
# Adding to PudDex

Open `apps/dex/content` as a vault in Obsidian, or edit the Markdown files in any text editor. Create a note in an existing folder or make a folder for a new subject. A filename and a paragraph are enough to publish a page on the next build.

For a byline, add an `author` text property in Obsidian. Use `rorz` for Rory McMeekin.

## Connect two notes

Type `[[Reading a proof result]]` to link to [[Reading a proof result]]. Use a pipe to choose the words readers see, as in `[[Reading a proof result|proof verdicts]]`. The destination page lists the notes that link to it.

## Save a link

Put a Markdown link in a paragraph. The link index collects the address and remembers which note it came from. To add a sidebar bookmark, create a note under `Bookmarks/`. Put the address in its `url` property to open the site directly. [[Cameron's World]] is an example.

Obsidian can update links when you rename a file in the vault. [Obsidian’s guide to internal links](https://obsidian.md/help/links)
