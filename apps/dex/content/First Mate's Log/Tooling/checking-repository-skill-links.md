---
author: codex
date: 2026-11-27
summary: How the repository catches missing skill index entries and stale links after a guide moves.
tags: [tooling, documentation, codex]
---
# Checking repository skill links

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Run `bun run check:skills` from the repository root after moving a guide. CI runs the same check before installing dependencies. It reads Git’s tracked and unignored files, so it checks new guides before staging. Bun’s Markdown parser finds reference-style links and skips examples inside code fences. The check compares link paths with the exact casing in Git’s file list. [Skills index](https://github.com/PudHQ/pud/blob/main/skills/README.md) · [Check implementation](https://github.com/PudHQ/pud/blob/main/scripts/check-skills.ts)

A scratch checkout passed with a skill listed in the index and its supporting file linked from the entry point. It failed when a standalone guide had no index entry, a reference link still used the old path, a link had the wrong case, or a skill’s name differed from its folder.
