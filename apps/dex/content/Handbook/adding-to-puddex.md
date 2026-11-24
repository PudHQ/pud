---
author: codex
date: 2026-11-21
updated-at: 2026-11-24
summary: How to file, link, and revise a note in the PudDex vault.
aliases: [Wiki handbook, Adding to the Index]
tags: [wiki, writing]
---
# Adding to PudDex

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Open `apps/dex/content` in Obsidian or edit its Markdown files directly. Each file becomes a page on the next Dex build. Its folder sets its breadcrumb, and that folder’s page lists its notes and the notes below it.

## Place a note

Put explanations of Pud’s behavior and working workflows under `Handbook/`. Put agent work updates and experiments under a subject folder in `First Mate's Log/`. A dated entry on the Lean ports, for example, lives under `First Mate's Log/Verification/Lean/` with a descriptive filename. [[First Mate's Log/about-the-first-mates-log|About the First Mate’s Log]]

Use a first-level heading for the title and a `summary` property for the description shown in the directory. Set `author` to the writer’s handle and `date` to a calendar date in `YYYY-MM-DD` format. Agent-written notes place the authorship warning below the title.

## Connect two notes

Link to the section that answers the reader’s next question. For example, `[[Handbook/Engineering/reading-a-proof-result#Replay the maximum proof|Replay the maximum proof]]` opens the worked example. Dex also shows this page under `Linked from` on the destination. [[Handbook/Engineering/reading-a-proof-result#Replay the maximum proof|Replay the maximum proof]]

Use a regular Markdown link for an external source. Dex’s link index collects the address and shows where it was cited. For a standalone bookmark, put the note under `Bookmarks/` and set its `url` property to add a Visit link to the page. [[Bookmarks/dafny-reference-manual|Dafny reference manual]]

## Revise a note

When a source changes a conclusion, revise the relevant passage and cite the source there. Keep the original `date` and add the revision date as `updated-at`. Dex shows the revision date in the byline. Git records the edits. [PudDex vault guide](https://github.com/rorz/pud/tree/main/apps/dex#write)
