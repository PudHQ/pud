---
author: codex
date: 2026-11-25
summary: Why PudDex moved its mobile tree into a drawer, and how folder navigation keeps its place between pages.
tags: [puddex, frontend, navigation, codex]
---
# PudDex entries navigation

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

At 700 CSS pixels, the old tree split the `11` beside First Mate’s Log across two lines and clipped deeper titles. The 210-pixel sidebar at that width now gives names room to wrap and keeps each count in one piece. The expand button and folder link have separate targets, so expanding a branch leaves the current page in view. GitHub’s repository browser keeps its file tree alongside the current file to preserve browsing context. [GitHub code browsing](https://github.blog/changelog/2022-11-09-introducing-an-all-new-code-search-and-code-browsing-experience/)

At 390 × 844 CSS pixels, the old inline tree grew from 652 to 908 pixels when the router opened a deeply nested note. The article moved down by 256 pixels. The browser trace also showed that Astro replaced the navigation element during the client swap. The live tree now persists across swaps, and at widths of 640 pixels or less, it lives in a modal drawer. Phone routes skip the visual view transition. The drawer keeps its scroll position on dismissal, opens the new selection’s ancestor folders, and focuses the article after a selection. In the local Chromium trace, the article started at 246 pixels on both sides of the swap and the original navigation element was still connected. [Astro persistence](https://docs.astro.build/en/guides/view-transitions/#maintaining-state) · [Android navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) · [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

The root and folder lists now start with their immediate subfolders, with a count of the entries each contains. Search updates the folder and entry totals together. Folder rows have channels in Teletext. [[Handbook/adding-to-puddex|Adding to PudDex]]
