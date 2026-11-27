---
author: codex
date: 2026-11-24
updated-at: 2026-11-26
summary: How the landing page cues its followspot, lightning charge, Octocat dialogue, and manga curtain.
tags: [design, animation, accessibility, frontend]
---

# GitHub star spotlight

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The oval around the GitHub link cues the followspot. The button shimmers and jiggles gently in the oval. The lightning bank, Octocat’s shock pose, and the charge clock start at the link’s own rectangular hitbox. On the way back to the oval, leftover electricity dies out and the face settles into its shimmer while the same lamp stays up. The lamp lowers and fades when the pointer clears the oval or reaches a neighbouring control. A quick return to the oval reverses the dimming from its current level.

Keyboard focus cues the light and charge. Escape clears the cue and keeps focus on the link. Reduced motion uses still cues and preserves dialogue timing. A touch activation goes straight to the repository. The GitHub link opens in a new tab. [Input handling](https://github.com/PudHQ/pud/blob/main/apps/www/features/github-star/attach-spotlight.ts)

## Lighting trials

The resting button is black with a monochrome Octocat and a star count. Moving into the oval reveals travelling chrome highlights and the proof factory’s screen-glass treatment. Branching blue lightning fills the glass in about 2.8 seconds and releases 48 sparks at full charge. The white label picks up a bevel and dark inset while the electricity runs. At 320 CSS pixels the count fits under “GitHub” beside the Octocat. [Button face](https://github.com/PudHQ/pud/blob/main/apps/www/features/github-star/spotlight-link.tsx) · [[Ideas/rockbuster|Rockbuster]]

Jhey Tompkins’s sparkles informed the corner glints. Magic UI's traveling highlight informed the rim, Josh W. Comeau's layered button informed the press depth, and the Codrops particle demo informed the mix of glints and pixels. [Sparkle Button](https://codepen.io/jh3y/pen/LYJMPBL) · [Shimmer Button](https://magicui.design/docs/components/shimmer-button) · [3D button](https://www.joshwcomeau.com/animation/3d-button/) · [Particle Effects for Buttons](https://tympanus.net/codrops/2018/04/25/particle-effects-for-buttons/)

The first frame draws during the pointer event. The lamp reaches full exposure in about 124 ms. The iris overshoots from a random starting point and settles in about 290 ms. The lens anchors the shaft, while dust falls in screen space and glints where the light finds it. The fixture rotates with Pud’s grip. Its focus collar and lens draw on the Robert Juliat Arthur. [Arthur quick-start guide](https://www.robertjuliat.com/PDF/QS/DN41195900_qs_ARTHUR_v1_EN-FR.pdf)

The defined pool takes its cue from Canto’s photograph of a seated performer. The pale shaft and softer falloff use Jack Weir’s lighting for *Dust* as a reference. [Canto followspot gallery](https://cantousa.com/canto_gallery/followspots-gallery/) and [*Dust* production photographs](https://www.weirdlighting.co.uk/dust/).

## Octocat’s dialogue and the curtain

Octocat starts speaking one second after full charge. The three lines start five seconds apart, with 200 ms fades and a one-second fully hidden pause between balloons. The pointer tilts the balloon around the tail, which is anchored near the mouth. The lettering is centred in the inked body of each balloon.

The first balloon is a soft oval, the second says its line through a wavering outline, and the third uses a sharp burst. Mochida Moo’s hand-inked balloons and Nate Piekos’s mouth-directed tails informed the shapes. The dialogue and curtain use the locally bundled Citrustime lettering face. [Mochida Moo’s process](https://tips.clip-studio.com/en-us/articles/992), [Blambot lettering conventions](https://blambot.com/pages/comic-book-grammar-tradition), and [Citrustime](https://github.com/wareya/CitrustimeFont).

Five seconds after the last line, Pud’s upper panel, Octocat’s lower panel, and the title panel slide together. The portraits move at separate depths and gold lightning breaks at the seams. At phone width the portraits sit above the title. Go Back and Escape slide the panels back out. The dialog focuses Go Back on entry and uses still panels with reduced motion.

## Browser checks

Open the running landing page on port 4901. Hold in the oval beside the GitHub link to see the shimmer, then move onto the link to start the charge. Move off the link into the oval to let the electricity settle. Move outside the oval and back during the dimming to check that the scene continues. To see the curtain, hold on the link for about 19 seconds. Tab to the GitHub link and press Escape to dismiss its cue while keeping focus.

The translucent header applies its blur to a background pseudo-element. Applying it to the header itself would give the fixed spotlight a header-sized containing block. With the new header at 1280 × 800, the overlay measured 1280 × 800 during a full charge. Keyboard Escape restored the black face and kept focus on the link. [Site header](https://github.com/PudHQ/pud/blob/main/apps/www/components/site-header.tsx)

In the original lighting trial, the header fit on one row at 320, 390, 592, 593, 640, and 1280 CSS pixels with the live star count. The smallest link target measured 46 × 44 CSS pixels. At 1280 × 720, the pointer ellipse was about 366 × 166 CSS pixels around a 200 × 48 CSS-pixel link.

At 1280 × 720, the in-app browser used a 1448 × 815 spotlight backing store. A three-second charge sample drew about 120 frames per second with a 9.2 ms 95th-percentile interval and zero intervals over 25 ms. The measured stage recovered from about 73% exposure on a quick return during dimming. A synthetic touch pointer left the canvas idle.

The desktop check observed the first line one second after full charge and the curtain about 18.8 seconds into the hover. The two pauses measured about one second each at zero opacity. At 320 × 568, the shout lettering cleared its ink outline by at least 14 CSS pixels on each side, and Go Back fit within the curtain viewport. The browser opened GitHub in a separate tab and kept the landing page open.

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

## Octocat relief

The built-in ImageGen tool created the matching idle and shocked poses. The 256 × 128 alpha atlas is saved at `apps/www/public/github-octocat-relief.webp`.

```text
Use case: stylized-concept
Asset type: one transparent two-frame sprite atlas for a GitHub link's 34px Octocat medallion.
Draw an original little Octocat bas-relief with the recognizable chunky rounded kitten head, two pointed cat ears, a rounded inset face and five short curved octopus arms. Treat it as a premium die-cast object photographed straight on: dark gunmetal, strong sculpted bevels, deliberately broad readable planes, finely picked out contact shadows and crisp cool silver highlights. The sculptural edges, face and tentacles must read at tiny icon size. No circular coin border, since that is supplied by the interface.
The left frame is the idle state, entirely monochrome graphite and pewter, with a relaxed small smile and subtle dark eyes. The right frame is the same sculpt, silhouette, scale, and angle after an electric shock. Keep the graphite arms and ears. Add a polished blue-white rim catch, two comically wide porcelain-white eyes with small dark pupils, high lifted brows, and a tiny but very readable open O mouth. Make the expression genuinely startled. Use really simple strong shapes in the face for legibility at 34px.
Place the two isolated complete figures side by side, clearly separated, centered at 25% and 75% of the atlas width with equal visual size and matching baselines. Use a wide canvas. Leave a little transparent breathing room around each. True transparent alpha behind both icons. No pedestal, surrounding circle, lightning, floating accents, cast shadow outside the figures, text, watermarks, or logos.
```

## Curtain portraits

The built-in ImageGen tool created the two 1439 × 810 portraits in `apps/www/public/github-star-curtain-pud.webp` and `apps/www/public/github-star-curtain-octocat.webp`. Each used the previous combined character draft as a reference.

```text
Landscape 16:9 anime panel, no lettering.
Use case: illustration-story
Asset type: a standalone illustrated upper reaction panel for a manga curtain on Pud.dev. It will occupy half the screen width and half the height.
Input image 1 is the previous artwork. Extract only the flan character Pud and keep his large black round spectacles, tapered custard flan shape, caramel cap, dusty rose bow tie, blush and profoundly exhausted half-lidded facial acting. No Octocat in this panel.
Redraw Pud alone as a richly detailed anime close-up, slumped and floating in space-cloud ether. He is JUST a seamless flan-shaped pudding with the caramel crown, glasses and bow tie. No arms, hands, gloves, fingers, legs, feet or other limbs anywhere on Pud. A soft tired exhale and lowering eyelids convey exhaustion. Work in very fine irregular ink hatching below his eyes, polished tortoiseshell frames with restrained translucent reflections that keep the expression readable, translucent amber/copper layers around the caramel rim, small syrup maculations, custard bloom and controlled cel-shadow facets. Use cinema-level lighting, fine painterly manga contour accents, strong draftsmanship and mature facial acting. No accessories apart from round glasses and bow tie.
Backdrop: pastel-lilac and powder-blue star clouds with soft wisps of pearlescent ether, scattered pinprick constellations and textured indigo shadows, like hand-painted anime atmospheric key art. One faint electrical wisp deep in the clouds. Refined palette of dusty pink, warm peach, copper and smoked lavender. The scene still has deep blacks and readable graphic shapes. Distant clouds and tight focused character in the foreground.
Place Pud centrally, large, with all important face details and bow tie entirely inside the middle 72% of frame width and middle 78% of frame height. A little surrounding ether provides safe cropping at the edges. Single solo panel, artwork reaches all four edges. No legs, arms, hands, feet, dramatic yellow collision sparks, divided panels, borders, other characters, words, lettering, watermark or logos.
```

```text
Landscape 16:9 anime panel, no lettering.
Use case: illustration-story
Asset type: a standalone illustrated lower reaction panel for a manga curtain on Pud.dev. It will occupy half the screen width and half the height.
Input image 1 is the previous artwork. Extract only the gray-violet Octocat character. Preserve the broad kitten head, two sharp pointed ears, pale inset face, and a spread of visible softly curved octopus arms. No Pud in this panel.
Redraw Octocat as a richly detailed anime reaction close-up, woozy and adrift in space-cloud ether. It has TWO unmistakable oversized spirals in its eyes, drawn with dark clean concentric curling strokes on pale ivory violet sclera, an off-kilter gasping mouth and one octopus arm curled at its own temple. It has four or five graceful, individually modelled octopus arms, no human hands. A spare ring of four illustrated pale-gold and cherry-pink dizzy stars orbits above and between its ears, with thin broken elliptical pen trails. Keep the stars floating close to the head and the two spiral eyes large and fully legible. Add meticulous tapered ink in shadows, subtle stipple screentone and muted violet speckles on the tentacles, reflective edge cuts in the ears, pale pastel-blue bounced light and distinctive anime reaction genga detail. Preserve charm without generic rounded sticker styling.
Backdrop: pastel-lilac and powder-blue star clouds with soft wisps of pearlescent ether, scattered pinprick constellations and textured indigo shadows, like hand-painted anime atmospheric key art. A touch more cool violet than warm. Match the original panel's refined dusty colour and cinema-level ink density. Clearly separate the pale face and star orbit from the cloud layer.
Place Octocat centrally and large. Keep both eyes, ear tips, orbiting stars, and the most readable arms inside the middle 72% of frame width and middle 82% of frame height so the expression survives edge crops. Single solo panel, artwork reaches all edges. No flan, other characters, borders, letters, words, numerals, logos, watermark or dramatic collision-line effect.
```
