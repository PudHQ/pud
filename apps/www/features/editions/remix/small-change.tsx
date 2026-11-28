"use client";

import { useState } from "react";
import { BenchNav, control } from "./bench-ui";

const study = "https://github.com/PudHQ/pud/blob/main/experiments/alpha-design/study-rule-diff.ts";
const minutes = [59, 60, 61];

export function SmallChange() {
  const [minute,setMinute] = useState(60);
  const [draft,setDraft] = useState(true);
  const paid = minute<60 ? 5 : 10;
  const allowed = minute<60 ? [5] : draft ? (minute===60 ? [5,10] : [10]) : [10,15];
  return <main className="bg-emerald-950 text-emerald-50">
    <div className="mx-auto max-w-7xl px-5 sm:px-9">
      <BenchNav name="Small Change" source={study} />
      <header className="grid items-end gap-4 border-b border-emerald-50/50 pt-6 pb-5 md:grid-cols-12 lg:pt-10">
        <h1 className="text-5xl leading-none font-black tracking-tighter sm:text-7xl lg:text-8xl md:col-span-8">The $5 edit.</h1>
        <p className="max-w-sm text-base leading-snug md:col-span-4">Both versions pay $10 for a one-hour outage. An edit to the rule lets the next version pay $5.</p>
      </header>
      <div className="grid items-start gap-4 py-5 md:grid-cols-12 lg:gap-7">
        <section className="md:col-span-4">
          <h2 className="font-serif text-3xl italic">Audit the promise.</h2>
          <fieldset className="mt-4 flex flex-wrap gap-1"><legend className="mb-2 font-mono text-xs uppercase">Outage duration</legend>{minutes.map(n=><button key={n} type="button" aria-pressed={n===minute} onClick={()=>setMinute(n)} className={`${control} border border-emerald-200/70 px-3 font-mono text-sm aria-pressed:bg-lime-200 aria-pressed:text-emerald-950`}>{n} min</button>)}</fieldset>
          <button type="button" aria-pressed={draft} onClick={()=>setDraft(!draft)} className={`${control} mt-3 font-semibold underline underline-offset-4`}>{draft ? "Inspect original rule" : "Inspect edited rule"} ↔</button>
        </section>
        <section aria-label="Permitted payouts" className="min-w-0 border-4 border-double border-emerald-950 bg-lime-100 p-4 text-emerald-950 shadow-lg md:col-span-8 sm:p-6">
          <div className="flex flex-wrap justify-between gap-2 border-b-2 border-emerald-950 pb-2 font-mono text-xs font-bold tracking-widest uppercase"><h2>Outage credit note</h2><span>{draft ? "Edited rule" : "Original rule"}</span></div>
          <div className="grid grid-cols-3 items-center gap-x-3 gap-y-1 py-5">
            <div className="col-span-2 min-w-0">
              <p className="font-serif text-lg italic">Permitted credit for {minute} minutes</p>
              <output className="mt-2 flex flex-wrap items-baseline gap-x-2 font-serif text-5xl leading-none sm:text-6xl font-bold tracking-tighter lg:text-7xl">
                {allowed.map((credit,i)=><span key={credit}>{i>0 && <small className="mr-2 text-xl font-normal italic">or</small>}${credit}</span>)}
              </output>
            </div>
            <img src="/editions/remix/bench/credit-clerk.webp" alt="Engraved Pud inspecting an outage clock." width="420" height="458"
              className="w-full mix-blend-multiply" />
          </div>
          <p className="flex flex-wrap items-center justify-between gap-2 bg-emerald-950 px-3 py-2 font-mono text-sm text-lime-100"><span>Actual payout</span><strong>${paid} on both revisions</strong></p>
        </section>
      </div>
      <p className="mt-1 max-w-xl border-t border-emerald-50/50 py-4 text-sm">From Pud’s rule-review design study. The experiment compares 121 outage durations and four possible credits.</p>
    </div>
  </main>;
}
