"use client";

import { useState } from "react";
import { countOdds } from "../../../../../packages/pud/.examples/for-continue";
import { BenchNav, control, fixtureRoot } from "./bench-ui";

const tickets = [-3, 4, 0, 7];
export function OddJobs() {
  const [run, setRun] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const values = swapped ? [-3, 5, 0, 7] : tickets;
  const odds = countOdds(values.map(BigInt));
  return <main className="bg-amber-100 text-ink">
    <div className="mx-auto max-w-7xl px-4 sm:px-8">
      <BenchNav name="Odd Jobs" source={fixtureRoot + "for-continue.proof.ts"} />
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-ink py-4 sm:py-6">
        <h1 className="text-6xl leading-none font-black tracking-tighter uppercase italic sm:text-8xl lg:text-9xl">Odd jobs.</h1>
        <p className="max-w-xs text-base leading-snug font-semibold">Four workers clock in. TypeScript’s <code>continue</code> skips every even ticket. Does a negative odd ticket count?</p>
      </header>
      <section aria-label="Shift tickets" className="grid grid-cols-2 gap-1 border-b-4 border-ink bg-ink p-1 sm:grid-cols-4">
        {values.map((v,i) => <div key={i.toString()} className="relative min-w-0 bg-orange-50 p-2 text-center sm:p-3">
          <img src={`/editions/remix/bench/crew-${i+1}.webp`} alt="" width="320" height="400" className={`mx-auto aspect-4/5 w-full object-contain mix-blend-multiply ${run && v % 2 === 0 ? "grayscale opacity-45" : ""}`} />
          <p className="flex flex-wrap items-center justify-center gap-x-2 border-t-2 border-ink pt-2 font-mono text-xs font-bold uppercase"><span className="font-sans text-2xl font-black">{v}n</span>{run ? (v % 2 === 0 ? "Skip" : "Count") : "On shift"}</p>
        </div>)}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>setRun(!run)} className={`${control} border-2 border-ink bg-ink px-5 font-bold text-yellow-100 hover:bg-blue-950`}>{run ? "Reset the line" : "Run the shift"} →</button>
          <button type="button" aria-pressed={swapped} onClick={()=>setSwapped(!swapped)} className={`${control} border-2 border-ink px-4 font-bold hover:bg-yellow-200`}>{swapped ? "Swap 5 for 4" : "Swap 4 for 5"}</button>
        </div>
        <output className="font-mono text-sm font-bold">{run ? `countOdds → ${odds}n` : "countOdds(values)"}</output>
      </div>
      <p className="text-sm">Pud checks the odd count for every dense bigint list in the model.</p>
    </div>
  </main>;
}
