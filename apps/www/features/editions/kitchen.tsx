"use client";

import { useState } from "react";
import { alphaEntryPath, pudDexUrl } from "@/lib/links";

const samples = [
  { amount: 0.125, label: "+12½¢" },
  { amount: -0.125, label: "−12½¢" },
  { amount: 0.375, label: "+37½¢" },
] as const;

const interactive = "focus-visible:outline-2 focus-visible:outline-offset-4";
const centsSource = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/cents.proof.ts";

export function TestKitchen() {
  const [sample, setSample] = useState<number>(0);
  const amount = samples[sample].amount;

  return (
    <main className="bg-amber-50 text-wordmark-ink">
      <div className="mx-auto max-w-screen-2xl px-5 sm:px-9 lg:px-14">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b-2 border-wordmark-ink sm:min-h-20">
          <a href="/" aria-label="Pud home" className={`flex min-h-11 items-center gap-2 text-3xl leading-none font-black tracking-tighter ${interactive}`}>
            <img src="/pud.svg" alt="" width="34" height="34" className="size-8 object-contain" /> Pud<span className="-ml-2 text-red-700">.</span>
          </a>
          <nav aria-label="Test kitchen" className="flex items-center gap-4 text-sm font-semibold sm:gap-7">
            <a className={`inline-flex min-h-11 items-center hover:underline ${interactive}`} href={pudDexUrl}>Handbook</a>
            <a className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-wordmark-ink px-4 hover:bg-wordmark-ink hover:text-amber-50 ${interactive}`} href={alphaEntryPath}>Join the alpha <span aria-hidden="true">↗</span></a>
          </nav>
        </header>
        <div className="grid items-center gap-7 py-7 sm:py-10 lg:grid-cols-12 lg:gap-8 lg:py-12 xl:gap-12">
          <section aria-labelledby="kitchen-title" className="min-w-0 lg:col-span-5">
            <p className="mb-5 flex items-center gap-2 font-mono text-xs font-semibold tracking-widest uppercase text-red-800">
              <span className="inline-block size-2.5 rounded-full bg-red-700" aria-hidden="true" /> The Pud Test Kitchen
            </p>
            <h1 id="kitchen-title" className="font-serif text-6xl leading-none font-bold tracking-tighter sm:text-7xl 2xl:text-8xl">
              The proof is<br />in the <em className="font-normal text-red-800">pud.</em>
            </h1>
            <p className="mt-5 max-w-sm text-lg leading-snug sm:text-xl">Write a rule for your TypeScript. Pud asks Lean to prove it for every input the rule covers.</p>
            <a href="#rounding" className={`mt-6 inline-flex min-h-12 items-center gap-6 rounded-full bg-wordmark-ink px-5 text-sm font-bold text-amber-50 hover:bg-red-900 ${interactive}`}>Try the half-cent rule <span aria-hidden="true">↓</span></a>
          </section>
          <figure className="min-w-0 lg:col-span-7">
            <img src="/editions/kitchen/pud-test-kitchen.webp" alt="Pud in round glasses operating a miniature adding machine at a kitchen workbench." width="1536" height="1024" fetchPriority="high" className="aspect-3/2 w-full rounded-3xl object-cover" />
          </figure>
        </div>
        <section id="rounding" aria-labelledby="rounding-title" className="grid scroll-mt-4 gap-6 border-t-2 border-wordmark-ink pt-7 pb-12 sm:pt-9 md:grid-cols-2 md:gap-10">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest uppercase text-red-800">Recipe / cents.proof.ts</p>
            <h2 id="rounding-title" className="mt-3 font-serif text-4xl leading-none font-semibold tracking-tight sm:text-5xl">Which way is half?</h2>
            <p className="mt-3 max-w-md leading-snug">Scale a JavaScript number by 100 and round to the nearest integer. Exactly halfway? Take the higher cent.</p>
            <a href={centsSource} className={`mt-1 inline-flex min-h-11 items-center font-mono text-sm font-semibold underline underline-offset-4 ${interactive}`}>Inspect the TypeScript rule ↗</a>
          </div>
          <div className="border-l-4 border-red-800 bg-amber-100 px-4 py-4 sm:px-6">
            <fieldset>
              <legend className="mb-2 font-mono text-xs uppercase tracking-wider">Put an amount through</legend>
              <div className="flex flex-wrap gap-2">
                {samples.map((entry, index) => <button key={entry.label} type="button" aria-pressed={sample === index} onClick={() => setSample(index)} className={`min-h-11 cursor-pointer rounded-full border border-wordmark-ink px-3 font-mono text-sm font-bold aria-pressed:bg-wordmark-ink aria-pressed:text-amber-50 hover:underline ${interactive}`}>{entry.label}</button>)}
              </div>
            </fieldset>
            <p aria-live="polite" className="mt-4 border-t border-wordmark-ink/30 pt-2 font-mono text-sm">
              Math.round({amount * 100}) <span aria-hidden="true">→</span> <strong className="text-lg">{Math.round(amount * 100)}¢</strong>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
