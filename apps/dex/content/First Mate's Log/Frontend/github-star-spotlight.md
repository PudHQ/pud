---
author: codex
date: 2026-11-24
updated-at: 2026-11-24
summary: How the landing page’s followspot shares space with the GitHub link and neighbouring controls.
tags: [design, animation, accessibility, frontend]
---

# GitHub star spotlight

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The landing page’s GitHub link sits inside a larger oval that cues the followspot. The pointer can start the cue as it approaches the link. The real link keeps its hitbox while its glass face tilts, and the cue clears when the pointer reaches a neighbouring control. Keyboard focus starts the cue, Escape clears it while leaving focus on the link, and reduced motion shows a still. The input handling lives in `apps/www/app/github-star-spotlight.tsx`.

## Lighting trials

The button uses a pressed base, a travelling chrome highlight, and the proof factory’s pink phosphor for the charge rail and sparks. When the meter fills at roughly 2.8 seconds, the button releases 48 sparks. On narrow screens the label sits above the star and count. [[Ideas/rockbuster|Rockbuster]]

Jhey Tompkins’s sparkles informed the corner glints. Magic UI's traveling highlight informed the rim, Josh W. Comeau's layered button informed the press depth, and the Codrops particle demo informed the mix of glints and pixels. [Sparkle Button](https://codepen.io/jh3y/pen/LYJMPBL) · [Shimmer Button](https://magicui.design/docs/components/shimmer-button) · [3D button](https://www.joshwcomeau.com/animation/3d-button/) · [Particle Effects for Buttons](https://tympanus.net/codrops/2018/04/25/particle-effects-for-buttons/)

The first frame draws during the pointer event. The iris overshoots from a random starting point and settles in about 290 ms. The lens anchors the shaft, while dust falls in screen space and glints where the light finds it. Keeping the dust in screen space lets the moving beam sweep across it.

The defined pool takes its cue from Canto’s photograph of a seated performer. The pale shaft and softer falloff use Jack Weir’s lighting for *Dust* as a reference. [Canto followspot gallery](https://cantousa.com/canto_gallery/followspots-gallery/) and [*Dust* production photographs](https://www.weirdlighting.co.uk/dust/).

## Browser checks

Open the running landing page on port 4901. Enter the oval beside the GitHub link, pan the pointer, and hold it there until the meter fills. Move outside the oval to clear the scene. Move over the waitlist link to confirm it retains its own hover. Tab to the GitHub link and press Escape to dismiss the cue while keeping focus. Reduced motion presents the fully lit scene as a still. A synthetic touch pointer event left the canvas idle.

In this run, the header fit on one row at 320, 390, 592, 593, 640, and 1280 CSS pixels with the live star count. The smallest link target measured 46 × 44 CSS pixels. At 1280 × 720, the pointer ellipse was about 366 × 166 CSS pixels around a 200 × 48 CSS-pixel link.

At 1280 × 720, the in-app browser used a 1448 × 815 canvas backing store. A warmed synthetic pointer move drew the first frame synchronously. A 3.06-second sample of canvas draws averaged 120 per second with a 9.5 ms 95th-percentile interval and zero intervals over 25 ms. The instrumented cue averaged 8.9 dust grains per frame after the initial pickup.

## Operator sprite

The built-in ImageGen tool drew a transparent operator from the Pud mascot. The 384 × 350 WebP is saved at `apps/www/public/pud-followspot-operator.webp`. The renderer shades the audience side of the sprite and keeps the reflections facing the lamp, then mirrors the pose for cues from the opposite wing.

```text
Use case: stylized-concept
Asset type: a transparent character sprite for Pud.dev's theatrical followspot.
Input image 1 is the identity reference for Pud. Draw a new performance pose for the same caramel flan mascot, with its squat tapered pudding shape, dark caramel cap, big round eyeglasses and little bow tie.
Pud is a focused theatre lighting operator, shown in three-quarter profile facing screen right and leaning toward a followspot with short expressive dark-gloved arms. Give him a compact black production intercom headset with a boom mic. Both hands reach toward the same control at the right, near 55% of the body height, as if one is steadying the handle and one is trimming the focus. A small dark boot or two can ground the stance. Keep the character unmistakably a squat flan, with the distinct caramel crown and round lenses visible in the silhouette. He should read from an 100px tall sprite.
Lighting: theatrical low key. Broad interior planes are almost black in charcoal and brown-plum, with just enough reflected light to read the arms, headset and bow tie. A narrow, discontinuous cool-white rim from upper right picks out the leading brow, edge of the glasses, glove and shoulder. Keep most edges black, with a little muted caramel on the cap. Draw real shadow shapes and occlusion. Avoid a neon outline, flat gray transparency, white sticker border, glowing eyes, or a well-lit recolor of the reference.
Composition: one clean full-body character isolated on true transparent alpha, filling the frame with a small margin. Crisp graphic animation-cel shapes, confident proportions, a charming purposeful gesture. No lamp or tripod in the sprite because the site renders both in motion. No background, beam, scenery, typography, watermark or cast shadow outside the silhouette.
```
