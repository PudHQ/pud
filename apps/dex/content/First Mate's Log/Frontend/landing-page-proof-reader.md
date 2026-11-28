---
author: codex
date: 2026-11-26
updated-at: 2026-11-28
summary: Pud’s mascot, four rounds of interactive landing pages, and an animated construction of the triangular-number identity.
tags: [frontend, design, illustration, codex]
---
# The landing page proof reader

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The landing page pairs the original Pud mascot with “Mathematicians have proofs. Why don’t devs?” Its [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean#Run the search proof|linear-search example]] proves that a TypeScript function returns the first matching index or `-1` when the target is absent. The [[First Mate's Log/Frontend/pud-log-newsstand|signup and newspaper]] sit between the hero and the PudDex terminal. [Hero](https://github.com/PudHQ/pud/blob/main/apps/www/features/home/hero.tsx) · [Page layout](https://github.com/PudHQ/pud/blob/main/apps/www/app/page.tsx)

At 320 CSS pixels, the hero had 16-pixel outer gutters and the Dex occupied all 320 pixels. Stacking the star count beneath its label kept both header buttons on one row with 44-pixel touch targets. At 1280 pixels the hero gutters measured 38.4 pixels and the title and illustration sat side by side. The header waitlist link focused the email field on repeat activation. [[First Mate's Log/Frontend/github-star-spotlight|GitHub star spotlight]]

## Archived illustrations

The proof reader, mathematician and blackboard cutouts, and Mandelbrot artwork are archived with the desktop screenshots. The first illustrated hero used a 1200 × 800 WebP generated from the mascot with the prompt below. [Design archive](https://github.com/PudHQ/pud/tree/main/press/landing-page/2026-11-27) · [Original mascot](https://github.com/PudHQ/pud/blob/main/apps/www/public/pud.svg)

```text
Use case: illustration-story. A standalone landscape spot illustration for Pud’s web poster, in the style of a beautifully inked mid-century computing handbook. Use the reference for Pud’s identity: a little custard flan with a shiny caramel cap, round dark spectacles, rosy cheeks and a red bow tie. Pud leans over a 1960s teal desktop computer, watching a long ribbon of punched paper curl from its reader into the foreground. Show Pud’s face clearly in three-quarter view. Behind them, one large flat vermilion sun. Compose one confident, compact silhouette with visible negative spaces and a few lively ink marks. Screen-printed spot colors, warm butter yellow, tomato red, faded teal and near-black, crisp tapered ink lines, fine halftone shadows and small registration imperfections. The limited shading and paper grain belong inside the drawing. Pure white surround, breathing room on all four sides. No lettering, numbers, logos, borders or captions.
```

## Pud Editions

The Pud Editions archive holds 55 interactive landing-page studies and the Crash Test × Night Shift remix. Each study has a direct URL. The bookmark beside a title saves it to a shortlist in the current browser. The arrows stay within the selected round. [Open the archive](https://pud.dev/editions) · [PR #20 and the preview reels](https://github.com/PudHQ/pud/pull/20)

### Round one

The first ten pages include the original Workbench, Desktop, Factory, Cartridge, and Sunday Strip. [Browse round one](https://pud.dev/editions?round=1)

| Edition | What a visitor can inspect |
| --- | --- |
| Test Kitchen | Half-cent ties in the JavaScript number model, including a negative amount. |
| Workbench | The passing availability refactor and the exact failing input when it drops a batch. |
| The Pud Gazette | The same missing vote, told as a newspaper investigation. |
| Pud Desktop | A file browser for zigzag, clamp and cents sidecars. |
| Field Guide | An annotated projection of the clamp function with symmetric bounds. |
| Cartridge | A playable search with a duplicate and an absent target. |
| Proof Factory | The clamp invariant and the entrance to the PudDex terminal. |
| Observatory | A circular instrument for turning seconds into milliseconds. |
| Sunday Strip | Two illustrated panels and a choice of indices in the linear-search example. |
| Proof Theatre | An onstage reveal of the dropped-batch replay witness. |

The interactive examples display the fixture’s recorded result or compute a small example in JavaScript. The accompanying source links lead to the complete proof suites. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]] · [[Handbook/Engineering/Verification/Lean/checking-typescript-with-lean|Checking TypeScript with Lean]]

### Round two

Workbench, Pud Desktop, Proof Factory, Cartridge and Sunday Strip informed the [second round of 25 editions](https://pud.dev/editions?round=2). Each starts with something a visitor can operate. The arrows move within the current round. The rounds use the same locally saved shortlist.

In [Night Shift](https://pud.dev/editions/night-shift), the release decision turns on a single missing vote. [Breakpoint](https://pud.dev/editions/breakpoint) lets the reader follow a search with duplicate entries. [Odd Jobs](https://pud.dev/editions/odd-jobs) uses individual comic portraits to show which values a loop skips. Those pages run the TypeScript functions used by the sidecars on the displayed inputs. Lean runs separately when the suites are checked.

Two studies show other kinds of evidence. [Small Change](https://pud.dev/editions/small-change) lets the reader compare two allowed payouts at minute 60 with the $10 the app actually returned. It reproduces a finite [rule-review experiment](https://github.com/PudHQ/pud/blob/main/experiments/alpha-design/study-rule-diff.ts). [Press Check](https://pud.dev/editions/press-check) draws one square per assertion from the committed Test262 benchmark, including unsupported cases. [[Handbook/Engineering/Verification/typescript-compatibility|TypeScript compatibility]]

The release desk, sorting office, printed cards, four-frame animation, comic workers and other original images use the built-in ImageGen tool. Tape Splice reuses Pud’s archived proof-reader illustration. [Round-two art and prompts](https://github.com/PudHQ/pud/blob/main/press/landing-page/2026-11-27/round-two-art.md) · [Edition catalog](https://github.com/PudHQ/pud/blob/main/apps/www/features/editions/catalog.ts)

### Crash Test No. 1

[The missing square](https://pud.dev/editions/midnight-impact) shows why doubling a staircase of 1 through `n` tiles fills an `n × (n + 1)` rectangle. A second copy rotates half a turn. The camera straightens as the pieces meet so their final dimensions can be read. The desk operator comes from Night Shift’s original illustration.

The TypeScript loop counts down. Editing its guard from `remaining > 0n` to `remaining > 1n` skips the last addition of one. Each staircase loses one tile. At `n = 8`, the doubled result is 70 and the rectangle has 72 positions. Pud with Lean 4.19.0 proved the original bound and sum laws, and its Bun replay returned `0n` on the edited guard at `n = 1n`. Both guards return zero at zero, so one is the smallest nonnegative counterexample. The board runs both functions on the displayed input. [Registered proof](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/countdown-sum.proof.ts) · [Board model](https://github.com/PudHQ/pud/blob/main/apps/www/features/editions/remix/midnight-impact/sum-model.ts)

### Round three

The [third round](https://pud.dev/editions?round=3) gives each hero one action. Flyposter uses different halftone treatments of the archived Pud artwork for sheets a reader can peel. Jog Wheel tracks the angle and speed of a finger on its record. Pressure Type displaces a cast wordmark under the pointer. Wobble gives the existing factory pudding mold a face and a spring response. The other six directions are Ripcord, Feedback, Pin Wall, Lenticular, Split Flap, and Keybed. [Round-three implementations](https://github.com/PudHQ/pud/tree/main/apps/www/features/editions/round-three)

The design references emphasized different entry points. Teenage Engineering places the physical controls beside its product. Cursor demonstrates its interface inside the landing page. Bun gives developers an install command immediately. For Pud this became a direct manipulation, one product description, and an alpha link. Each gallery clip records the real control in use and loads on hover or keyboard focus. [Teenage Engineering](https://teenage.engineering/) · [Cursor](https://cursor.com/) · [Bun](https://bun.com/)

### Round four

The hotline plays back recorded results, the map follows a proof into its Lean theorem, and the pocket console runs the same bit-mask function as the checked example. Two panels ranked the working pages before the final interface revisions. [[First Mate's Log/Frontend/round-four-landing-review|Review, rankings, and revisions]] · [Browse round four](https://pud.dev/editions?round=4)

### First-round artwork

The Test Kitchen miniature, theatre backdrop and desktop wallpaper used the built-in ImageGen tool. The clamp plate plots the symmetric slice with `z = clamp(x, −b, b)`. Sunday Strip reuses the archived comic panels above. [Edition art](https://github.com/PudHQ/pud/tree/main/apps/www/public/editions)

#### Test Kitchen

```text
Use case: illustration-story. A full-bleed landscape hero illustration, 3:2 landscape. One striking, very tactile editorial photo of a handcrafted miniature stop-motion film set. A fluted golden caramel custard pudding character, glossy dark amber caramel cap, oversized round black spectacles with luminous eyes, cheerful determined smile, little scarlet bow tie, on a brushed silver laboratory kitchen workbench. The pudding is the scientist, prominent and in the foreground, testing a tiny retro cream-and-coral desktop adding machine with a long off-white receipt curling elegantly across the tabletop. A couple of stainless steel calibration weights, a chrome dial gauge, and a squat glass beaker. Strong side light and warm deep shadows. Seamless luminous tomato-orange studio cyclorama, predominantly sunlit fiery orange, golden custard, scarlet, chrome, inky dark brown, cream. Charming Aardman-like handmade practical model detail and midcentury food photography, sophisticated art direction, not flat clipart or a UI. Close-up, low camera, intentional single compact tableau, framed with 8% breathing room. No typography, no words, no lettering, no graphics or borders.
```

#### Paper theatre

```text
Wide landscape, 2:1. An entirely empty, open miniature toy paper theatre stage from the 1890s, straight-on and symmetrically framed to the image edges. Glowing tarnished gold and vivid coral velvet curtains in deeply folded arcs hung along the top edge and two narrow claret drapes tied open against the outer 12% of each side. Hand-engraved black shellac gold filigree, crescent moons, fine diagonal lines and tiny painted foil stars in the margin of a handmade screenprinted pop-up book. Center 65% width from top 18% down to 80% completely free, an essentially flat midnight plum black painted stage cyclorama, only 4 or 5 pinprick stars on the periphery. Below, a low wooden stage, a row of seven small round brass footlights. Atmospheric warm illumination at the bottom of side drapes, darkness in central area for cream typography later. Sophisticated antique misregistered inks, wine, persimmon, antique muted gold and darkest aubergine; luxurious sharply carved editorial illustration. There are absolutely no performers, objects on stage, letterforms, banners, text or watermarks. No white exterior, image goes to all four edges. Art only.
```

#### Proof Country

```text
Use case: illustration-story. Wide 2:1 raster wallpaper for a delightful 1992 independent computer operating system. Pixel-perfect restrained 16-bit landscape, with a blue cyan sky and flat cream pixel clouds, layered aquamarine blue distant hills and pine forests, warm lime and emerald grassy hills framing a placid reflective pond, warm apricot flowers in the foreground. The entire LEFT 55% is mostly simple calm sky, clouds and distant landscape because a window will overlay it later. On the RIGHT third there is an enchanting round custard-pudding-shaped country observatory building with a caramel brown roof and a brass telescope poking out at an angle from the top, circular black window panes reading as eyeglasses, a short bridge over the pond and small steps. Lovely tiny storytelling details. A spring morning, sun shining, warm earthy shadows. Big bold, legibly pixelated clusters, limited 24-color palette, chunky pixel dithering, viewed as an original 320x160 pixel artwork scaled up with nearest neighbor. Genuine old adventure game scenery, no icons, no border, no UI, no text, no people or characters outside the building. Edge-to-edge artwork.
```
