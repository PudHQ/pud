---
author: codex
date: 2026-11-27
updated-at: 2026-11-28
summary: The GitHub social card artwork, typography, and crop measurements.
tags: [frontend, design, imagegen, codex]
---
# Pud’s GitHub social card

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud sits on a cyan mechanical key with a checkmark that refers to `pud.dev check`. The card pairs cream type with an ink field and a vermilion frame around the mascot. It uses the landing page’s Google Sans Flex wordmark at 244 px and sets “Proofs for TypeScript.” on one line in the 48 px display face. [Card](https://github.com/PudHQ/pud/blob/main/press/pud-github-social-card.png) · [Wordmark settings](https://github.com/PudHQ/pud/blob/main/apps/www/app/styles.css) · [[First Mate's Log/Frontend/landing-page-proof-reader|The landing page proof reader]]

The opaque PNG is 1280 × 640 and weighs 282,362 bytes. The supplied GitHub template marks an 80 px inset on each side. The type and mascot fit within that inset, and the caption and checkmark were legible at 320 × 160. [GitHub’s social preview specification](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)

## Artwork prompt

The built-in ImageGen tool rendered the transparent illustration from the original mascot. The type and backdrop were composed after generation. [Original mascot](https://github.com/PudHQ/pud/blob/main/apps/www/public/pud.svg)

```text
Use case: style-transfer.
Asset type: original campaign illustration for the right side of Pud's GitHub repository social card.
Image 1 is the identity reference for Pud, the same mascot to reimagine as a tactile three-dimensional collectible. Retain the squat custard-flan silhouette, cap of glossy dark amber caramel that drips just a little, round espresso-colored spectacles with two clearly readable eyes, small rosy cheeks, subtle self-satisfied smile, and hot-red bow tie. Keep the face a little off-center as in the reference. The pudding is the character's entire body.
Subject: Pud is perched on the rear half of one oversized cyan mechanical keyboard keycap. The front part of the key's top is exposed and shows one very large, perfectly clean indented ivory checkmark. The checkmark is a crisp two-stroke tick. A slim charcoal switch base sits just under the keycap, with a believable small gap showing the key being pressed. One compact, readable silhouette with a little forward energy.
Art direction: high-end practical product photograph of a playful designer toy and a vintage computer part. Warm translucent flan and syrup with a few beautiful hard highlights, glossy enamel bow tie, coarse matte pebbled cyan ABS on the keycap, precise molded edges. Butter custard, amber, deep brown, saturated cyan and cherry red. Soft key light from upper left, a crisp cyan rim, strong form and legibility at thumbnail size. Warm and cheeky expression. Keep the caramel highlights simple and the glasses readable. No lens glare across the pupils.
Composition: isolated cutout, slightly overhead three-quarter view with modest perspective, the face and whole tick both easy to see. Make Pud substantially larger than the key vertically. Keep the entire flan, key, and switch base inside the composition with generous transparent margins. Deliver true transparent alpha all around. Everything in the picture is this single mascot-on-key object. The checkmark is the only marking on it. No text, no letters, no extra keys, no hands, no stage, no effects, no backdrop, no halo.
```
