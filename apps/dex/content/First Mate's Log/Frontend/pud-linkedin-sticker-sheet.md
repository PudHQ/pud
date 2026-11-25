---
author: codex
date: 2026-11-25
updated-at: 2026-11-25
summary: Mascot references and print details for Pud's LinkedIn profile and company sticker-sheet covers.
tags: [design, mascot, imagegen]
---

# Pud LinkedIn sticker sheet

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/rorz/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The banner sets eight versions of Pud into a single paper-backed sticker sheet on a walnut desk. Raking light makes the grooves around each sticker visible. A curl on the colored pixel sticker and another on the holographic sticker expose the release liner. The embroidery, rainbow foil, and Delftware are new treatments for the sheet. PudDex also renders a holographic treatment of its monochrome mascot. [PudDex foil component](https://github.com/rorz/pud/blob/main/apps/dex/src/components/pud-foil.astro)

| Form | Source artwork |
| --- | --- |
| Silver robot | [PudDex callout mascot](https://github.com/rorz/pud/blob/main/apps/dex/public/pud-robot.png) |
| Colored pixel sprite | [Proof factory loader](https://github.com/rorz/pud/blob/main/apps/www/public/puddex-loader.png) |
| Monochrome pixel sprite | [PudDex foil sprite](https://github.com/rorz/pud/blob/main/apps/dex/public/pud-chrome.png) |
| Anime | [Pud curtain portrait](https://github.com/rorz/pud/blob/main/apps/www/public/github-star-curtain-pud.webp) |
| Newspaper engraving | [The Pud Log engraving](https://github.com/rorz/pud/blob/main/apps/www/public/pud-log-engraving.webp) |

The [[First Mate's Log/Frontend/github-star-spotlight#Curtain portraits|curtain portrait note]] records the original anime artwork prompt. The five original forms were placed in a rough layout, which the built-in ImageGen tool turned into a first sticker-sheet draft. The desk-scene edit used that draft to preserve the eight illustrations and their positions.

In the glossy revision, a reflected window brings out the sheen on the cream backing. Both lifted edges carry their ivory sticker margins and cast a shadow on the exposed liner. The holographic curl folds inward to reveal a broader area of the cutout.

The full-width ImageGen edits measured 2172 × 724. Cropping 2172 × 543 from 88 pixels below the top and resizing to 1584 × 396 kept all four sheet edges and both curls in view. The PNG has room at lower left for the profile photo. [Banner PNG](https://github.com/rorz/pud/blob/main/press/pud-linkedin-banner-v4.png) · [LinkedIn profile cover specifications](https://www.linkedin.com/help/linkedin/answer/a568217)

## Desk-scene prompt

```text
Use case: product-mockup
Asset type: a lifelike desk photograph for a wide LinkedIn profile cover.
Input image 1 is the edit target and the exact set of eight mascot designs. Preserve their identity, their individual art and materials, the staggered arrangement, and which two peel. Rework the physical sheet and environment into a real photo.

Make a single thin, flexible, off-white paper-backed vinyl sticker sheet lying directly on a real warm medium-walnut desk. The wood has naturally irregular grain with warm window light. In the quiet top left out on the desk, show just a cropped corner of a gray keyboard and a plain graphite pencil. Compose close to overhead, but with a small oblique camera angle that makes the front paper edge and shadows visible. A worn speck or two and soft imperfect daylight give it the look of a real working desk. Natural photographic tones, with the sheet and every cut edge in crisp focus. No words.

Show how a real kiss-cut sticker sheet is made. A thin continuous matte ivory face stock with the waste matrix left on surrounds every single sticker. A deep, unmistakable, crisp debossed groove precisely follows the contour of each mascot within the continuous face stock. The channel scalps a narrow dark sliver on one side and catches a hairline highlight on the other; give it believable compression and embossed paper detail. The flat stickers and the surrounding matrix are nearly flush, visibly cut into the same top layer. Give selected details a slight raised spot-varnish emboss that catches the window light. Use raking light from the upper left so the grooves read at small banner size. Let the outer edge show the two very thin layers of liner and face stock with a faint small contact shadow on the wood. All eight designs are prints and special finishes on this single thin sticker stock, even the embroidered-looking print and the Delftware-looking print.

Exactly two stickers visibly lift out of their own die-cut grooves. The lower-left edge of the warm colored pixel sticker rolls upward and inward, leaving a clearly visible matching recess and pale exposed release paper beneath it. The upper-right edge of the bright rainbow foil sticker is likewise bent up and back with its matte adhesive side in the light and a narrow, distinct crescent of shadow in the recess. The lifted parts stay attached at the opposite edge. Their designs and bow ties stay readable. All six other prints lie flat, with the debossed contours clearly visible. The silver robot, grayscale pixel Dex mascot, tired anime mascot, embroidery, colored pixel sprite, newspaper engraving on a saucer, rainbow holographic print, and blue-and-white Delftware stay recognizable as the same eight designs.

Very wide panoramic photo, 3:1 or wider. The final output is cropped to a 4:1 rectangle taking the center 75% of the canvas height at 3:1. Keep the complete physical sheet outline inside the middle 61% of the canvas height to leave wood visible above and below in that crop. Keep the sheet wide and right-weighted across roughly 79% of the frame width, with empty wood below the keyboard in the left fifth for a profile photo. Keep the two curls and the upper and lower sheet edges fully visible within the 4:1 banner crop.
```

## Gloss and peel prompts

The first built-in ImageGen edit added the gloss and reshaped both peels. It used the full desk-scene artwork and the close-up as a reference for the holographic corner.

```text
Use case: precise-object-edit
Asset type: the full panoramic LinkedIn banner.
Image 1 is the entire photograph to edit. Image 2 is a close-up pointing out the flawed holographic peel, for diagnosis only. Keep the full original framing, desk, keyboard, pencil, thin rectangular sheet, and eight Pud artworks at their original size and positions. Change only the two peeled sticker corners, the local shadows, and the sheen of the ivory sheet.

Rebuild the bottom-left peel of the colored pixel flan and especially the upper-right peel of the rainbow holographic flan as real thin vinyl lifted out of two fixed kiss-cut openings. On the rainbow one, resolve the missing upper-right curve in the cut line that the reference close-up points to. The original die-cut perimeter is a single precise, closed outline in the plane of the glossy surrounding sheet. It stays fixed and visible all the way around the exposed section of each seat, including around the far side behind the curl. Reveal a clean wedge of smooth, slightly lower ivory release liner bounded by that original groove. The revealed wedge is precisely the area the lifted corner used to cover. Treat the lifted corner as the same thin piece of printed film, bent up and toward its own center on a clear hinge, one underside and one continuous edge. Its free edge matches the cut shape if lowered. A modest lift leaves the shaped empty seat and its unbroken groove plainly visible outside the curl. Keep the other edge attached and flush in the groove; keep the face, glasses and tie readable. Use the same construction for the pixel peel, following the stepped contour of its original die cut. No overlapping double borders, disconnected flaps, melting edges, or floating stickers.

Use the photograph's upper-left light for both peels. Dark, narrow contact shadow at each hinge, broadening and softening down-right as the film lifts higher. A tight thin shadow inside the fixed groove and a softly shaded ivory adhesive underside make the layers legible. Keep the cast shadows subtle and physically anchored to those two curled edges and the sheet's edge.

Change the surrounding cream backing from grainy matte paper to visibly glossy, smooth, cream-coated release stock. Make the sheen substantially stronger: a wide soft window reflection sliding across the flat plane, plus localized almost white glints tracing the groove lips and the thin edge of the sheet. Use soft falloff so all eight designs and both exposed cutout shapes remain crisp. Keep the camera and light direction, all other sticker artwork and physical positions, and the original 3:1 frame with the entire sheet inside the same 4:1 central banner crop. No typography.
```

A second edit folded the holographic curl inward to expose more of the cutout.

```text
Use case: precise-object-edit
Edit the one full panoramic photo provided. Preserve the exact framing and every other part of the photo, including the glossy cream laminate and its window reflections, the other seven stickers, the lower-left peel of the colored pixel flan, and the artwork of the rainbow flan below its caramel crown.

Redraw only the rainbow holographic sticker's upper-right corner and the shadow immediately below it. The most important visible detail is a broad, empty, shape-matched pocket in the sheet's plane, to the upper right of the bent sticker. Trace the sticker's original full tapered silhouette in the sheet with a fine crisp stationary kiss-cut line that flows around the exposed upper-right shoulder and joins the rest of the groove smoothly. The empty section of smooth pale release liner enclosed by this groove must have visible width, around 15% of this sticker's total width, and be plainly visible between the curl and the stationary groove. The groove is in the backing, drawn separately and clearly outside the curling edge.

Peel the sticker corner back toward the sticker's center. Bring the thin flexible corner's free tip diagonally INWARD, so that the curved underside ends over the flan's foil caramel crown instead of reaching out toward the groove. Let the remaining sticker stay flush in its seat with the lifted section visibly continuous along a short hinge. Give the little curl a satin ivory adhesive underside with physically thin edges. The groove traces exactly where that flap would sit if flattened. Keep both glasses lenses, the expression and the bow tie clear. Put a compact, slightly soft shadow on the exposed release liner, cast down and right from the curled vinyl, with a narrow, firmer join at the hinge and a feathered edge where the vinyl rises. Let the fixed groove's fine shadow remain distinct from the lifted flap's shadow. This is a small localized photographic repair, not a redesign. Output the full original ultra-wide photo, with all eight mascots and all four outer edges of the sheet.
```

The border pass made the ivory margin move with the printed film. An enlarged paintover guided the holographic rim along its lifted edge. The matte underside and the fine stationary incision keep the two layers legible.

```text
Use case: precise-object-edit
Edit image 1, the full panorama. Image 2 is an enlarged paintover guide of just the holographic sticker; its white stroke marks precisely where the raised die-cut margin should run. Keep the existing bend and add that clearly visible band of opaque ivory vinyl along the lifted free edge, rendered as a real strip of material under the same light. Blend it continuously into the rest of the sticker's cream outer border at both ends. This pronounced band is part of the sticker and twists with the colored foil. The shadowed underside is a softer warm beige. The upper-right exposed pocket has the same cream liner as the sheet, with a single fine recessed groove behind the lifted rim. Soften the bright line on the groove in only that empty pocket so it reads as an incision. Keep the shape and shadow of the curl. Preserve the other seven stickers, the colored pixel peel, the gloss, desk, original details and exact full panoramic framing. The paintover is a placement guide; render the rim with natural shading and clean, continuous edges.
```

## Broad diagonal peels

The close-up reference showed a broad diagonal fold with a white underside. ImageGen matched that shape on the holographic sticker and rotated the fold to the lower-left corner of the colored pixel sticker. The larger folds make both peels readable at banner size.

```text
Use case: precise-object-edit
Image 1 is the full panoramic Pud LinkedIn banner to edit. Image 2 is the exact visual reference for the peel shape and scale. Output the entire panorama of Image 1, with the wooden desk, glossy cream sticker sheet, all eight mascots and their original positions. Change only the two peels and the shadows directly around them.

On the lower-row rainbow sticker, match Image 2 closely. Replace the little corner curl with the broad upper-right diagonal flap in that reference, turned back roughly one-third of the way across Pud. Show the clean opaque white adhesive underside, broad smooth curved diagonal lip sweeping across the caramel cap and brushing the top of the glasses, and the characteristic soft shaded fold. Reveal the smooth pale release liner in the upper-right portion of the original silhouette beyond the raised flap, bounded by the original die-cut groove. The thin ivory vinyl border is part of the sticker and bends with the lifted free edge. Match the sample's large continuous sweep and the clear shadow under the lifted lip. Keep the rainbow foil, smile and bow tie visible.

Give the warm-colored pixel Pud in the lower row the same broad white flap and gentle diagonal curl, rotated to peel from its lower-left corner toward its center. Lift about one quarter to one third of the sticker, including its die-cut border. Keep the eyes and bow tie readable. The exposed liner sits flat inside its original cut. The hinge and contact shadows are smooth and weighted, with subtle shadow fading under each flap in the existing upper-left daylight. The other six stickers remain flat.

Preserve Image 1's 3:1 ultra-wide composition and exact framing. The full sticker sheet stays within the same central 4:1 banner crop. Preserve the gloss and window reflections on the cream backing.
```

## Small white curls

The final edit reduced the large folds to two small white tips. The pixel Pud lifts at the lower left and the holographic Pud lifts at the upper right, with both faces fully visible. The tiny shadows keep the lifted vinyl readable against the glossy sheet.

```text
Use case: precise-object-edit
Image 1 is the full banner to edit. Image 2 is a reference for the original mascot art currently hidden by the folds. Edit only the existing two sticker peels. Preserve all eight Pud designs, the desk, the reflective coating, the cut grooves, the lighting and the full 3:1 composition exactly.

Lay both large corner flaps almost entirely flat again to restore the colored pixel flan and the rainbow holographic flan, including their complete glasses, faces, caramel caps, and bow ties. Then lift only a very tiny tip of each sticker. Give pixel Pud one little flick up at the lower-left corner and rainbow Pud one little flick up at the upper-right edge. Each curl should be only about one tenth of its sticker's width and about one quarter the linear size of its current flap, a narrow upturned crescent with a slight roll, no broad diagonal fold. All artwork stays visible. On BOTH curls use the same clean opaque white underside with gentle cool-gray shading, visibly white against the warm beige backing. The ivory die-cut border rises briefly with that tiny tip. The exposed sliver of release liner stays inside its narrow fixed groove, with a short soft shadow directly underneath the tip. Preserve the rest of Image 1 and output the full panoramic photo for the same 4:1 crop.
```

## Tiled company cover

The company cover tiles 50 Pud designs across three staggered rows of 17, 16, and 17. The profile cover served as the mascot reference. A letterboxed layout with one placeholder per sticker kept the designs inside the narrow band before ImageGen rendered them. The series includes the original mascot forms and new treatments such as stained glass, CRT phosphor, and origami.

The built-in ImageGen render measured 2172 × 724. Cropping a 2172 × 368 band starting at row 181 removed the letterboxing while keeping all 50 stickers visible. The export is an sRGB PNG at 1512 × 256.

```text
Use case: product-mockup
Asset type: a new wide LinkedIn company-page cover, a dense wall of fifty different Pud micro-stickers on one glossy, kiss-cut ivory vinyl sticker sheet.
Image 1 is the editable layout plate. Keep its counts, coordinates and proportions: exactly three rows, 17 across the top, 16 offset in the middle, 17 across the bottom. Each colored placeholder becomes one beautiful, detailed, distinctive micro-sticker in the style list below. Image 2 is the character and materials reference for Pud. Pud is a squat tapered flan with a dark caramel cap, round glasses and a little bow tie. Keep that identity legible across all the radically different looks. Image 2's desk and layout are not the new composition.

Tightly tiled wall from left to right, seen square on from above. Fill each position with a complete distinct die-cut silhouette using up most of its cell, with consistent narrow cream gutters. The thin satin ivory release sheet is a single continuous surface. Give each sticker a neat creamy cut margin and a fine shadow in its kiss-cut groove. Use restrained angled gloss on the backing and make one or two tiny corners flick up a little to show white undersides. Use rich, punchy color variation and strongly differentiated visual mediums, accessories and textures. Readable at a small size, all individual art visible. No captions, typography, swatches, brand names, or space between tiles for logos.

Designs left to right in each row:
Top row, 17: full-color pixel art | polished silver robot | turquoise stained glass | lime punk fanzine | blue-and-white Delft porcelain | tired glossy anime Pud | ivory astronaut suit | coral and purple claymation | old sepia newspaper engraving on a saucer | bright green CRT scanlines | translucent lavender candy | medieval illuminated manuscript | salmon-and-black woodcut | checkered racing paint | red-bow embroidery | white marble sculpture | rainbow holographic foil.
Middle row, 16: monochrome PudDex pixel sprite | copper clockwork | Japanese wave print | red plaid flannel | amber blown glass | daisy-covered green botanical enamel | magenta comic halftone | night-shift stagehand with a headset | faceted aqua low-poly | shiny red and yellow candy-wrapper print | mint ice sculpture | red cinnabar lacquer and mother-of-pearl | yellow hard hat and reflective vest | chunky plum wax crayon | teal and brass Art Deco | gouache sunset stripes.
Bottom row, 17: classic golden custard Pud with a red bow | midnight galaxy filled with stars | coral cut-paper collage | purple storybook wizard | brushed-gold coin relief | olive green origami | cobalt technical blueprint | colorful stacked toy bricks | pastel ice-cream sundae | turquoise-and-pink psychedelic marble | brass deep-sea helmet | moss terrarium and tiny mushrooms | vivid lilac X-ray | tomato and cyan risograph | black volcanic rock with hot orange fissures | black rice-paper sumi ink | terracotta and turquoise mosaic tiles.

Critical framing: make the image 3:1 in the same letterboxed framing as Image 1. The ENTIRE 3-row sticker wall lives in the center half of the canvas height, spanning its whole width, specifically the same ivory letterbox region as Image 1. Keep all three rows complete, all glasses and bow ties visible, and the first and last stickers clear of the side edges. The plain dark framing bars above and below will be removed during export to 1512×256, so preserve the empty bars and the exact micro-sticker positions in the center. The final central strip is filled edge to edge by the sheet.
```

## Cutting the holographic sticker

The company cover shows a hand cutting the holographic Pud from the eight-sticker pack. The profile banner supplied the artwork and gloss reference. An overhead mock-up set the location of the blade tip, then a wider ImageGen edit left enough room around the sheet to show all eight designs in the company crop. The gridded mat makes the work surface readable against the cream liner.

The cutting-scene renders measured 2172 × 724. A 2172 × 368 crop starting at row 175 retained the full sheet, hand grip, and blade contact. The revised sRGB PNG measures 1512 × 256. [Company cover PNG](https://github.com/rorz/pud/blob/main/press/pud-linkedin-company-cutting-banner-v3.png) · [LinkedIn Page image specifications](https://www.linkedin.com/help/recruiter/answer/a569383)

```text
Use case: compositing
Asset type: top-down photographic LinkedIn Page cover, final crop 1512×256.
Image 1 is the rough edit target for the composition, pack position and blade contact. Replace the drawn placeholder desk, mat, hand and tool with high-fidelity photography. Image 2 is the actual Pud sticker pack reference. Preserve the original character artwork and its extra-glossy ivory sticker pack surface, especially the rainbow foil Pud with its tapered flan, caramel cap, round glasses and bow tie.

From directly overhead, show a natural human right hand coming in from the right edge, holding a small silver precision craft scalpel in a pen grip. The short pointed blade tip is visibly in contact with the white outer edge of the rainbow holographic Pud, at its right shoulder, tracing around the shape through the clear vinyl. A tiny newly separated arc in the cut edge can catch light just behind the tip. The sticker is still in the original pack, with the rest of its silhouette and face clearly visible and the hand to its right. The tool should unmistakably be a fine metal craft scalpel making contact, not a pen or a floating knife. Render believable fingers, one hand, short natural fingernails and real contact shadows. The neighboring original silver robot, pixel, anime, engraving, embroidery and blue-and-white stickers stay on the same single sheet.

The pack lies on a dark muted green self-healing gridded cutting mat on a warm walnut worktop. Real soft directional window light from upper left, with strong clean window sheen across the ivory release sheet and spectral flashes across the holographic ink. Preserve crisp separation between the steel tip and the brief cut in the vinyl. Detailed tactile documentary product photo. Let the side edges crop naturally. No writing, logos or extra tools.

Format: true 90-degree overhead. Make a 3:1 full source using the same placement as the rough layout. The central half of the height is the entire 1512×256 cover composition. The complete rainbow flan, the knife tip and useful length of handle, and the fingers holding the knife must all fit in that center band. The pack fills the left and middle of the panorama, and the hand anchors the right. Extend the natural tabletop and mat into the space above and below for cropping. Keep the rainbow sticker and actual contact point fully readable in the central super-wide crop.
```

```text
Use case: compositing
This is a nearly finished top-down photograph placed in a wider composition. Fill the four solid-brown placeholder bands with seamlessly extended real walnut, the continuation of the wrist toward the right edge, and the same oblique window light. Preserve the inner photograph's scale, original center positions, complete glossy Pud pack and all eight stickers, hand, and craft scalpel. Keep the fine steel tip precisely in contact with the white perimeter of the rainbow holographic sticker. Make any catchlight at the point of contact read as an ordinary subtle reflection in silver and vinyl. Maintain the existing overhead photograph, realistic hand anatomy, grid, strong sheet sheen and true reflections.

The whole rectangular sheet already fits in the central half of this 3:1 source, and that is the final 1512×256 crop zone. Keep all four sheet corners, the full rainbow sticker and its cut edge, and the hand's grip inside that zone at the exact size and placement provided. Do not magnify or shift the pack. Output the full width and height as a continuous photo.
```

### Edge-to-edge mat

The revised company cover fills the background with the cutting mat. Both fingertips sit on the textured metal grip, and the blade meets the holographic Pud's cut line. The other seven designs are printed flat on the glossy sheet.

```text
Use case: precise-object-edit
Edit the supplied top-down Pud company cover. Keep the exact composition and size of the glossy ivory sheet, all eight artworks and their positions, the right hand, true overhead camera, and warm window sheen. Make these three precise changes.

1. Fill the entire background with the existing dark green gridded cutting mat. Extend its same fine grid and subtle surface wear continuously past all four frame edges. The mat is the tabletop of the whole photograph, with no separate mat perimeter or exposed wood anywhere. Keep the sheet's shadow and hand's shadows cast across this mat.

2. Fix the metal craft scalpel grip. Show the pad of the index finger directly on top of the tool's checker-textured knurled grip, and the thumb pad directly opposite on the underside of that SAME textured metal cylinder. The textured cylinder is the narrow section immediately behind the blade holder, with the fingers actually enclosing it. Leave part of the crosshatching visible in the gap between the thumb and forefinger to make their placement unmistakable. Shift the fingertips forward and size the tool naturally. The smooth rear shaft extends back into the hand. No second bare grip section, floating fingers, or double tools. Keep the short pointed steel blade tip visibly in contact with the holographic Pud's right edge.

3. The holographic rainbow Pud is the only figure with a separate cut contour or raised vinyl edge. Keep its thin pale border and show the actual incised line where the blade meets it. All other seven Pud artworks are simply flat printing on the single glossy cream sheet. Remove each of their external contour grooves, white die-cut rims, embossed halos, and edge cast shadows so their ink silhouettes end directly on the same continuous glossy cream surface. Preserve their internal details, glasses, and original art styles. Lay the lower-left colored pixel artwork completely flat, without the existing white peeled corner.

Keep the 3:1 source framing intact. All four corners of the sheet, the full rainbow Pud, blade tip, and gripping fingertips must remain inside the same central band that crops to 1512×256. No added objects or lettering.
```

### Partial cut

The cut runs from the holographic Pud’s upper-left shoulder around its caramel cap to the scalpel tip. The rest of the artwork meets the glossy sheet directly. Keeping the visible incision to that arc shows the cut in progress.

```text
Use case: precise-object-edit
Edit this full panorama. Change only the outer perimeter of the holographic rainbow Pud under the scalpel. The person has just cut the first third of the sticker. Show one short continuous curved outline and actual incision, starting at the upper-left shoulder by the caramel cap, running clockwise across the cap's outer contour, and stopping exactly at the blade tip on the right shoulder. This open arc takes up about one third of the total sticker perimeter. Use a fine pale margin and a thin darker slit only on that arc. Remove the external ivory margin, relief, seam, shadows and outline completely from the other two thirds, including the entire bottom edge and bow area. In those uncut portions the colorful ink silhouette goes straight onto the continuous glossy ivory sheet like the other printed figures. No closed loop, no continuation past the knife point, no dotted guide, and no lifted flap. Leave the mascot artwork and the blade's contact point undisturbed.

Preserve everything else in the reference photo, including the edge-to-edge green gridded mat, the hand's thumb and index finger on the textured metal grip, all eight art positions, the flat and unoutlined other prints, the strong gloss, and the exact 3:1 framing for the 1512×256 crop.
```
