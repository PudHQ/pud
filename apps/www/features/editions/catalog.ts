export const firstRound = [
  { slug: "test-kitchen", title: "Test Kitchen", description: "A tabletop experiment in rounding half a cent." },
  { slug: "workbench", title: "Workbench", description: "Drop a batch of votes. Watch the proof break." },
  { slug: "gazette", title: "The Pud Gazette", description: "A broadsheet investigation into one missing vote." },
  { slug: "desktop", title: "Pud Desktop", description: "Open a disk of TypeScript proof files." },
  { slug: "field-guide", title: "Field Guide", description: "A field plate for the bigint clamp and its bounds." },
  { slug: "cartridge", title: "Cartridge", description: "Play the first-match problem on a handheld." },
  { slug: "factory", title: "Proof Factory", description: "Inspect a bigint clamp on the factory floor." },
  { slug: "observatory", title: "Observatory", description: "Turn seconds into milliseconds on a brass dial." },
  { slug: "sunday-strip", title: "Sunday Strip", description: "Two panels and a puzzle about the first matching index." },
  { slug: "theatre", title: "Proof Theatre", description: "Reveal the input that made a vote disappear." },
] as const;

export const secondRound = [
  { slug: "crash-test", title: "Crash Test", description: "Put a zero divisor on the track. Fit the catch." },
  { slug: "flipbook", title: "Flipbook", description: "Turn a page for every step of the countdown." },
  { slug: "night-shift", title: "Night Shift", description: "Decide whether to release a broken tally." },
  { slug: "frame-advance", title: "Frame Advance", description: "Scrub a pudding animation one frame at a time." },
  { slug: "small-change", title: "Small Change", description: "Catch the edit that makes a $5 payout legal." },
  { slug: "loop-loom", title: "Loop Loom", description: "Add a thread and count the new loop iterations." },
  { slug: "label-maker", title: "Label Maker", description: "Emboss a signed integer as a ZigZag label." },
  { slug: "last-seat", title: "Last Seat", description: "Try to book the last places in a print workshop." },
  { slug: "breakpoint", title: "Breakpoint", description: "Step through a duplicate or a missing match." },
  { slug: "odd-jobs", title: "Odd Jobs", description: "Run a shift where the even tickets get skipped." },
  { slug: "errata", title: "Errata", description: "Remove the rounding call that loses half a millisecond." },
  { slug: "switchyard", title: "Switchyard", description: "Send text and tool-call parts through dispatch." },
  { slug: "bit-press", title: "Bit Press", description: "Set eight bits and inspect their low 64 bits." },
  { slug: "sign-shop", title: "Sign Shop", description: "Round a fraction of a cent to either signed zero." },
  { slug: "rulebook", title: "Rulebook", description: "Play a hand of signed integer division." },
  { slug: "return-desk", title: "Return Desk", description: "Return an encoded integer to its original value." },
  { slug: "tape-splice", title: "Tape Splice", description: "Cut a number tape. Reconcile the two totals." },
  { slug: "cold-storage", title: "Cold Storage", description: "Find the warmest reading on a subzero shift." },
  { slug: "carbon-copy", title: "Carbon Copy", description: "Post a debit and compare the two slips." },
  { slug: "mail-room", title: "Mail Room", description: "Swap neighboring parcels until the line is sorted." },
  { slug: "patch-panel", title: "Patch Panel", description: "Wire two integers to the parity circuit." },
  { slug: "press-check", title: "Press Check", description: "Inspect every mark in a Test262 benchmark." },
  { slug: "margin-call", title: "Margin Call", description: "Find the extra answer a loose rule allows." },
  { slug: "parts-counter", title: "Parts Counter", description: "Order a 70-bit shift or a low-64-bit mask." },
  { slug: "two-keys", title: "Two Keys", description: "Set used capacity and batch size at the quota gate." },
] as const;

export const featuredRemix = {
  slug: "midnight-impact",
  title: "Crash Test No. 1",
  description: "Fit two staircases into a rectangle. Find the row an off-by-one sum missed.",
} as const;

export const thirdRound = [
  { slug: "flyposter", title: "Flyposter", description: "Tear through a wall of Pud posters." },
  { slug: "jog-wheel", title: "Jog Wheel", description: "Scratch the platter and let it coast." },
  { slug: "pressure-type", title: "Pressure Type", description: "Press your fingers into the lettering." },
  { slug: "ripcord", title: "Ripcord", description: "Pull the corner and turn the whole page." },
  { slug: "feedback", title: "Feedback", description: "Steer a video echo and freeze the frame." },
  { slug: "wobble", title: "Wobble", description: "Grab Pud. Stretch and release." },
  { slug: "lenticular", title: "Lenticular", description: "Tilt the print to change the exposure." },
  { slug: "keybed", title: "Keybed", description: "Play the keys with your keyboard or fingers." },
  { slug: "pin-wall", title: "Pin Wall", description: "Push a wave through the relief." },
  { slug: "split-flap", title: "Split Flap", description: "Advance the mechanical letter board." },
] as const;

export const fourthRound = [
  { slug: "dial-a-proof", title: "Dial-a-Proof", description: "Dial a proof, a counterexample, or the limits of the checker." },
  { slug: "case-files", title: "Case Files", description: "One ballot went in. Zero came out. Change the votes and replay the count." },
  { slug: "errant-press", title: "Errant Press", description: "Follow a half-cent error through three illustrated front pages." },
  { slug: "pocket-debugger", title: "Pocket Debugger", description: "Flip eight physical keys and read the full 64-bit result." },
  { slug: "night-window", title: "Night Window", description: "Take a claim to Pud’s night clerk and collect the punched receipt." },
  { slug: "exploded-view", title: "Exploded View", description: "Pull a proof file apart into its inputs, assumption, and claim." },
  { slug: "after-hours", title: "After Hours", description: "Tune from source to claim to a working replay on Pud TV." },
  { slug: "overprint", title: "Overprint", description: "Register three ink plates to assemble the ZigZag property." },
  { slug: "pud-county", title: "Pud County", description: "Follow linear search from the source mill to its Lean theorem." },
  { slug: "hot-metal", title: "Hot Metal", description: "Roll an impression of the clamp contract and save its proof file." },
] as const;

export const rounds = { 1: firstRound, 2: secondRound, 3: thirdRound, 4: fourthRound } as const;
export type Round = keyof typeof rounds;
export function roundPath(round: Round) {
  return round === 4 ? "/editions" : `/editions?round=${round}`;
}
export function roundFor(slug: RoundEdition["slug"]): Round {
  if (fourthRound.some(item => item.slug === slug)) return 4;
  if (thirdRound.some(item => item.slug === slug)) return 3;
  if (secondRound.some(item => item.slug === slug)) return 2;
  return 1;
}

export const roundEditions = [...fourthRound, ...thirdRound, ...secondRound, ...firstRound] as const;
export const editions = [featuredRemix, ...roundEditions] as const;

export type RoundEdition = (typeof roundEditions)[number];
export type Edition = (typeof editions)[number];
export function editionPath(slug: Edition["slug"]) {
  return `/editions/${slug}`;
}
