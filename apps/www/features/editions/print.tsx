"use client";

import { useState } from "react";
import { alphaEntryPath, pudDexUrl, pudLog } from "@/lib/links";

const source = "https://github.com/PudHQ/pud";
const examples = `${source}/tree/main/packages/pud/.examples`;
const searchProof = `${pudDexUrl}/notes/handbook/engineering/verification/lean/checking-typescript-with-lean/#run-the-search-proof`;
const link = "inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";
const smallCaps = "font-mono text-xs font-semibold uppercase tracking-widest";

export function Gazette() {
  return (
    <main className="min-h-screen bg-paper px-4 pb-14 text-stone-950 sm:px-9 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header>
          <nav aria-label="Gazette" className="flex items-center justify-between gap-2 border-b border-stone-700 font-mono text-xs">
            <a className={link} href="/">pud.dev</a>
            <div className="flex gap-4 sm:gap-6">
              <a className={link} href={pudDexUrl}>Handbook</a>
              <a className={link} href={alphaEntryPath}>Join the alpha ↗</a>
            </div>
          </nav>
          <p className="py-3 text-center font-serif text-5xl leading-none font-black tracking-tighter sm:py-5 sm:text-7xl lg:text-8xl">
            The Pud Gazette
          </p>
          <div className={`flex items-center justify-between gap-x-2 border-y-4 border-double border-stone-800 py-2 ${smallCaps}`}>
            <span>Software desk</span>
            <span className="text-right">TypeScript &amp; formal proof</span>
          </div>
        </header>

        <article aria-labelledby="gazette-headline" className="pt-6 sm:pt-8">
          <div className="grid items-center gap-y-5 lg:grid-cols-12">
            <div className="lg:col-span-6 lg:border-r lg:border-stone-400 lg:pr-8 xl:pr-14">
              <p className={`${smallCaps} mb-3 text-red-800`}>The availability report</p>
              <h1 id="gazette-headline" className="font-serif text-5xl leading-none font-bold tracking-tighter text-balance sm:text-7xl lg:text-8xl">
                The case of the missing vote.
              </h1>
              <p className="mt-5 max-w-xl font-serif text-xl leading-snug sm:text-2xl">
                We dropped a batch from a scheduler’s tally. Pud caught the mistake with an empty list and one available voter.
              </p>
              <a href="#evidence" className={`${link} mt-3 gap-2 font-mono text-sm font-bold text-red-800 underline`}>
                Examine the evidence <span aria-hidden="true">↓</span>
              </a>
            </div>
            <figure className="lg:col-span-6 lg:pl-8">
              <img width={1152} height={768} src="/pud-log-engraving.webp" alt="An engraved portrait of Pud in spectacles and a bow tie"
                fetchPriority="high" className="aspect-3/2 w-full border border-stone-500 object-cover mix-blend-multiply" />
              <figcaption className="mt-2 flex flex-wrap justify-between gap-x-3 font-serif text-sm italic">
                <span>Pud, the proof runner for TypeScript.</span>
                <span className="font-mono text-xs not-italic text-stone-600">Pud portrait archive</span>
              </figcaption>
            </figure>
          </div>

          <section id="evidence" aria-labelledby="evidence-title" className="mt-8 grid scroll-mt-6 gap-6 border-t-4 border-double border-stone-800 pt-5 md:grid-cols-12">
            <div className="md:col-span-4">
              <h2 id="evidence-title" className="font-serif text-3xl font-bold tracking-tight">The evidence</h2>
              <p className="mt-2 max-w-sm font-serif text-lg leading-snug">
                Count two batches together or tally each one separately. The totals must agree.
              </p>
            </div>
            <div className="md:col-span-4 md:border-x md:border-stone-400 md:px-6">
              <h3 className={smallCaps}>The failing input</h3>
              <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 font-mono text-sm">
                <dt>Left batch</dt><dd>[]</dd>
                <dt>Right batch</dt><dd>[1n]</dd>
                <dt>Expected</dt><dd>1n</dd>
                <dt>Returned</dt><dd className="font-bold text-red-800">0n</dd>
              </dl>
            </div>
            <div className="md:col-span-4">
              <h3 className={smallCaps}>The correction</h3>
              <p className="mt-3 max-w-md font-serif text-lg leading-snug">Restore the second tally. Lean proves the rule for every pair of dense bigint lists in the model.</p>
              <a className={`${link} font-mono text-xs font-bold text-red-800 underline`} href={`${examples}/availability`}>Read the source ↗</a>
            </div>
          </section>
        </article>
        <footer className="mt-6 border-t border-stone-600 font-serif text-sm italic">
          <a className={`${link} gap-1`} href={pudLog}>Dispatches from the project in <strong>The Pud Log ↗</strong></a>
        </footer>
      </div>
    </main>
  );
}

export function FieldGuide() {
  return (
    <main className="min-h-screen bg-green-950 text-paper">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <header className="flex flex-wrap items-center justify-between gap-x-3 border-b border-paper/40 py-2">
          <a href="/" className={`${link} gap-2 font-serif text-2xl font-bold tracking-tight`}>
            Pud <span aria-hidden="true" className="text-amber-300">✳</span> Field Guide
          </a>
          <nav aria-label="Field guide" className="flex items-center gap-4 font-mono text-xs sm:gap-7">
            <a href={pudDexUrl} className={link}>Handbook</a>
            <a href={alphaEntryPath} className={link}>Join the alpha ↗</a>
          </nav>
        </header>
        <div className="grid items-center gap-y-8 py-9 sm:py-12 lg:grid-cols-12 lg:gap-x-10 lg:py-16">
          <section aria-labelledby="guide-title" className="lg:col-span-5">
            <p className={`${smallCaps} text-amber-200`}>Formal methods in TypeScript</p>
            <h1 id="guide-title" className="mt-5 max-w-lg font-serif text-6xl leading-none tracking-tighter text-balance sm:text-7xl xl:text-8xl">
              What holds for <em className="font-normal text-amber-200">every input?</em>
            </h1>
            <p className="mt-6 max-w-sm text-lg leading-snug text-green-50">
              Give Pud a function and a rule. Its Lean adapter checks the rule across the input domain you declare.
            </p>
            <a className="mt-6 inline-flex min-h-11 items-center gap-5 border border-paper/80 px-4 font-mono text-sm hover:bg-paper hover:text-green-950 focus-visible:outline-2 focus-visible:outline-offset-4" href="#clamp-law">
              Study the clamp <span aria-hidden="true">↓</span>
            </a>
          </section>
          <figure className="border border-paper/60 bg-paper p-2 text-green-950 shadow-xl sm:p-3 lg:col-span-7 lg:rotate-1">
            <img src="/editions/print/clamp-plate.webp" width={1000} height={720} fetchPriority="high"
              alt="Wireframe of z = clamp(x, −b, b) with the lower, upper and interior regions labeled" className="h-auto w-full border border-stone-400/70" />
            <figcaption className="flex items-baseline justify-between gap-3 px-1 pt-2 font-serif text-sm italic">
              <span>The bounded clamp, with symmetrical limits.</span>
              <span className="shrink-0 font-mono text-xs not-italic">Plate I</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <section id="clamp-law" aria-labelledby="clamp-title" className="scroll-mt-0 bg-paper px-5 py-10 text-green-950 sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-7 md:grid-cols-2 md:gap-12">
          <div>
            <p className={`${smallCaps} text-red-800`}>Specimen / clamp.ts</p>
            <h2 id="clamp-title" className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Between two bounds.</h2>
            <p className="mt-3 max-w-md font-serif text-lg leading-snug">
              The plate shows symmetric bounds. The proof goes further. Whenever two bigint bounds are in order, the result stays between them.
            </p>
          </div>
          <div className="self-center border-y border-green-950/40 py-3">
            <p className="mb-3 font-mono text-xs text-green-900">clamp.proof.ts</p>
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed"><code>{`given(lower <= upper);
const result = clamp(value, lower, upper);
expect(result).to(
  pud.bigint().gte(lower).lte(upper)
);`}</code></pre>
            <a className={`${link} mt-1 font-mono text-xs font-bold underline`} href={`${source}/blob/main/packages/pud/.examples/clamp.proof.ts`}>Inspect the sidecar ↗</a>
          </div>
        </div>
      </section>
    </main>
  );
}

const candidates = [
  { index: 0, value: "7n", answer: "Exactly. The first match is at index zero." },
  { index: 1, value: "3n", answer: "That’s a three. The target is seven." },
  { index: 2, value: "7n", answer: "It matches, but the seven at index zero came first." },
];

function SearchStrip() {
  const [answer, setAnswer] = useState("");
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 font-bold">Pick the first <code>7n</code>.</legend>
      <div className="grid grid-cols-3 gap-2">
        {candidates.map(candidate => (
          <label key={candidate.index} className={`flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-ink
            bg-amber-50 font-mono text-xl font-bold hover:bg-amber-100 has-focus-visible:outline-2 has-focus-visible:outline-offset-2
            ${candidate.index === 0 ? "has-checked:bg-lime-200" : "has-checked:bg-orange-200"}`}>
            <input type="radio" name="search-index" value={candidate.index} className="sr-only" onChange={() => setAnswer(candidate.answer)} />
            <span className="text-xs font-normal text-stone-700">index {candidate.index}</span>{candidate.value}
          </label>
        ))}
      </div>
      <p role="status" className="mt-2 border-l-4 border-ink bg-amber-100 px-3 py-2 text-base font-semibold empty:m-0 empty:border-0 empty:p-0">{answer}</p>
    </fieldset>
  );
}

export function Comic() {
  return (
    <main className="min-h-screen bg-amber-300 px-3 pb-12 text-ink sm:px-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-x-3 border-b-4 border-ink py-2">
          <a href="/" className={`${link} gap-2 font-black tracking-tight`}>
            <img src="/pud.svg" alt="" width={34} height={34} /> pud.dev
          </a>
          <nav aria-label="Comic" className="flex gap-4 text-sm font-bold sm:gap-7">
            <a className={link} href={pudDexUrl}>Handbook</a>
            <a className={link} href={alphaEntryPath}>Join the alpha ↗</a>
          </nav>
        </header>

        <section aria-labelledby="comic-title" className="mt-5 sm:mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
            <h1 id="comic-title" className="font-sans text-5xl leading-none font-black tracking-tighter italic sm:text-7xl lg:text-8xl">Pud Comics<span className="text-red-800">!</span></h1>
            <p className="max-w-64 border-l-4 border-ink pl-3 text-sm leading-tight font-bold sm:text-base">An illustrated introduction to proofs for TypeScript.</p>
          </div>
          <div className="grid gap-2 bg-ink p-2 sm:grid-cols-2">
            <img width={1085} height={725} fetchPriority="high" src="/editions/print/mathematician.webp"
              className="w-full bg-amber-50" alt="A mathematician at a blackboard says, “Mathematicians have proofs.”" />
            <img width={1085} height={725} fetchPriority="high" src="/editions/print/developer.webp"
              className="w-full bg-amber-50" alt="Pud looks up from a notebook and asks, “Why don’t developers?”" />
          </div>
        </section>

        <section aria-labelledby="strip-title" className="mt-3 grid gap-6 border-4 border-ink bg-paper p-4 sm:p-6 md:grid-cols-2 md:gap-10">
          <div>
            <h2 id="strip-title" className="text-3xl leading-none font-black tracking-tight italic sm:text-4xl">The first-match problem.</h2>
            <p className="mt-3 max-w-md text-base leading-snug">
              Pud proves this search returns the first matching index, or <code>−1n</code> if the target is missing, for every dense bigint list in the model.
            </p>
            <a href={searchProof} className={`${link} mt-1 text-sm font-black underline`}>Read the proof ↗</a>
          </div>
          <div className="md:border-l-2 md:border-ink md:pl-6"><SearchStrip /></div>
        </section>
      </div>
    </main>
  );
}
