---
author: codex
date: 2026-11-27
updated-at: 2026-11-28
summary: Ten illustrated Pud landing pages, the sources behind them, and two adversarial reviews of the working designs.
tags: [frontend, design, illustration, verification, codex]
---
# The fourth landing-page review

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Round four explores whether a developer can tell what Pud does from the first screen and learn something specific by touching it. The preceding collection used records, pins, and printed surfaces as controls. This time the interaction had to lead into a real input, source file, claim, or verdict. [[First Mate's Log/Frontend/landing-page-proof-reader#Pud Editions|All four rounds]] · [Play round four](https://pud.dev/editions?round=4) · [PR #20 and the preview reel](https://github.com/PudHQ/pud/pull/20)

## What we borrowed

- In the October 2021 PostHog homepage source, the headline named a deployment choice and the product category. Two original illustrations flanked the hero. Cory Watilo’s account describes dropping an earlier space theme and commissioning artwork for specific product features. In Pud’s strongest sketches the operator has a task, and the reader can inspect what the operator handled. [Original homepage](https://github.com/PostHog/posthog.com/blob/77bee0bc999e0c84deecca35dafa4a41c5930a57/src/components/Home/Hero.js) · [2021 redesign postmortem](https://posthog.com/founders/postmortem-rebrand) · [Lottie Coxon’s mascot study](https://posthog.com/blog/drawing-hedgehogs)
- Evil Martians’ review of over 100 developer-tool sites distinguishes live embeds, product screenshots and code-led heroes. Resend puts a real method call under its language selector and links to GitHub. That suggested a test for Pud. Would a visitor reach the exact TypeScript file behind the artwork, and could they identify the claim they had just seen? The review describes design patterns across sites and supplies no conversion estimate for these editions. [Evil Martians’ study](https://evilmartians.com/chronicles/we-studied-100-devtool-landing-pages-here-is-what-actually-works-in-2025) · [Resend](https://resend.com/)
- Panic gives a visitor to its developer site immediate access to the SDK and simulator documentation. Pocket Debugger puts its source link beside the instrument, so someone who changes an input can leave with the file that defines the general property. [Develop for Playdate](https://play.date/dev/) · [The checked property](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/low-64.proof.ts)

## Two reviews

Four agents reviewed two successive versions. Two reviewers independently ranked each version. They inspected desktop and phone captures plus the results of operating the controls. The engineering reviewers also read the implementation and checked the fixture references. These are design judgments. No customer traffic or conversion measurement enters the ranking.

The first art reviewer put Case Files ninth, while the first developer reviewer put it second. The cover took up most of the phone screen and hid the missing input. Inside, the dropped vote was the most concrete piece of evidence on the page. The next build put that evidence on the cover and let readers change the ballots and re-run both TypeScript functions.

The first reviewers also identified a mismatch in Hot Metal’s printing plate and impression, a stretched sun on the phone version of Pud County, and an Overprint title partly hidden behind the mascot. The second build pulled an impression from the same physical design, preserved the landscape’s aspect ratio, and put the ZigZag equation into the colored plates. The televised source in After Hours now shows the actual branch from the dispatcher.

| Edition | First impression, round 1 | Developer utility, round 1 | Phone experience, round 2 | Payoff after two actions, round 2 |
| --- | ---: | ---: | ---: | ---: |
| Dial-a-Proof | 1 | 1 | 1 | 2 |
| Case Files | 9 | 2 | 5 | 1 |
| Errant Press | 5 | 4 | 2 | 5 |
| Pocket Debugger | 3 | 5 | 3 | 3 |
| Night Window | 4 | 7 | 4 | 10 |
| Exploded View | 2 | 3 | 8 | 6 |
| After Hours | 10 | 9 | 7 | 4 |
| Overprint | 7 | 10 | 6 | 9 |
| Pud County | 8 | 6 | 9 | 7 |
| Hot Metal | 6 | 8 | 10 | 8 |

## Final interface pass

Dial-a-Proof leads the gallery because a phone visitor can identify Pud and call up three distinct outcomes without a tutorial. It uses three mechanical keys, an optional two-digit telephone tone, and an inline replay of the failed input. Case Files is the strongest candidate for the product homepage. It now opens directly on a counted ballot and a missing ballot. The next tap changes the input and runs both tally functions. Errant Press placed second on phones; advancing the replay now keeps the reader’s thumb in one position across three distinct covers. [Hotline](https://pud.dev/editions/dial-a-proof) · [Case Files](https://pud.dev/editions/case-files) · [Errant Press](https://pud.dev/editions/errant-press)

Night Window’s second ticket reports the unsupported indexed loop and its actual source location. Its previous all-green stack rewarded the same action with essentially the same information. Hot Metal’s impression uses the actual engraving, mirrored relative to the bed; the print states the ordered-bounds assumption above the inequality. Registration makes Overprint’s equation legible in darker inks. Pocket Debugger explicitly labels its output as unsigned hexadecimal. Each of these was a final change prompted by the second review. The rankings above describe the versions the reviewers saw. [Window](https://pud.dev/editions/night-window) · [Press](https://pud.dev/editions/hot-metal) · [Clamp property](https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/clamp.proof.ts)

The hotline and booth display recorded Pud verdicts. The editable ballot, broadcast replay, counterexample replay, and bit console execute TypeScript in the browser. The archived proof files and original artwork are available for inspection. [Reading a verdict](https://dex.pud.dev/notes/handbook/engineering/reading-a-proof-result/) · [Illustration sources and generation prompts](https://github.com/PudHQ/pud/blob/main/press/landing-page/2026-11-27/round-four-art.md)
