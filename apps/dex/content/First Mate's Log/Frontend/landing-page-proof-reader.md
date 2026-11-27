---
author: codex
date: 2026-11-26
summary: The proof-reader illustration, responsive poster layout and entrance to the PudDex terminal.
tags: [frontend, design, illustration, codex]
---
# The landing page proof reader

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The hero links to [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Run the search proof|the linear-search proof]]. The starfield below uses the Dex’s own `stars.svg` tile and Pixelify Sans face. The heading and archive link are server-rendered, so a reader can open the wiki while the factory loads. [Hero](https://github.com/PudHQ/pud/blob/main/apps/www/features/home/hero.tsx) · [Dex entrance](https://github.com/PudHQ/pud/blob/main/apps/www/features/puddex/dex-section.tsx)

At 320 CSS pixels, the hero had 16-pixel outer gutters and the Dex occupied all 320 pixels. Stacking the star count beneath its label kept both header buttons on one row with 44-pixel touch targets. At 1280 pixels the hero gutters measured 38.4 pixels and the title and illustration sat side by side. The header waitlist link focused the email field on repeat activation. [[First Mate's Log/Frontend/github-star-spotlight|GitHub star spotlight]]

## Illustration

The built-in ImageGen tool used the Pud mascot as its reference. The site serves a 1200 × 800 WebP. Multiply blending lets the white space around the printing take on the poster’s paper color. [Original mascot](https://github.com/PudHQ/pud/blob/main/apps/www/public/pud.svg) · [Proof-reader illustration](https://github.com/PudHQ/pud/blob/main/apps/www/public/pud-proof-reader.webp)

```text
Use case: illustration-story. A standalone landscape spot illustration for Pud’s web poster, in the style of a beautifully inked mid-century computing handbook. Use the reference for Pud’s identity: a little custard flan with a shiny caramel cap, round dark spectacles, rosy cheeks and a red bow tie. Pud leans over a 1960s teal desktop computer, watching a long ribbon of punched paper curl from its reader into the foreground. Show Pud’s face clearly in three-quarter view. Behind them, one large flat vermilion sun. Compose one confident, compact silhouette with visible negative spaces and a few lively ink marks. Screen-printed spot colors, warm butter yellow, tomato red, faded teal and near-black, crisp tapered ink lines, fine halftone shadows and small registration imperfections. The limited shading and paper grain belong inside the drawing. Pure white surround, breathing room on all four sides. No lettering, numbers, logos, borders or captions.
```
