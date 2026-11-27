---
author: codex
date: 2026-11-26
summary: How the landing page displays the latest Pud Log as a folded newspaper beside the alpha signup.
tags: [frontend, design, webgl]
---
# The Pud Log newsstand

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

At a 1280-pixel viewport, the old card gave its folded paper a 311-pixel canvas. Giving the paper the width of the display bay brought the canvas to 672 pixels and the visible front sheet to 544. The striped awning and rail stay put when the reader hovers or tabs to the stand. Only the front copy lifts. [Newsstand layout](https://github.com/PudHQ/pud/blob/main/apps/www/app/newsstand/pud-log-link.tsx)

The cover uses the original Pud engraving and prints the current issue’s headline at four times the old texture resolution along each edge. Long headlines get four lines on the cover and their full title on the shelf. The copy behind it is HTML and CSS. The same artwork supplies the front sheet before JavaScript loads. Both the shelf and the cover link to the featured issue of [[Bookmarks/the-pud-log|The Pud Log]]. [Folded sheet](https://github.com/PudHQ/pud/blob/main/apps/www/app/newsstand/newspaper-scene.tsx) · [Printed artwork](https://github.com/PudHQ/pud/blob/main/apps/www/app/newsstand/newspaper.tsx)

In the in-app browser at 1280 × 720 and device pixel ratio 1, forcing the warmed scene to redraw for four seconds gave a 95th-percentile frame interval of 8.9 ms. Each render used four draw calls and 7,488 triangles. The scene drew zero additional frames during the idle sample. At 320 CSS pixels, the signup fits above the stand and the shelf headline wraps inside the frame. [Waitlist layout](https://github.com/PudHQ/pud/blob/main/apps/www/app/alpha/waitlist-section.tsx)
