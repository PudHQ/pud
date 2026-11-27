"use client";

import { useState } from "react";
import { maxElement } from "../../../../../packages/pud/.examples/max-element";
import { BenchNav, control, fixtureRoot } from "./bench-ui";

const logs = [
  { title: "Night shift", values: [-12, -7, -3, -9] },
  { title: "Defrost", values: [-3, 2, 0, -1] },
  { title: "Empty log", values: [] },
];
function temperature(value: number) { return (value < 0 ? "−" : value > 0 ? "+" : "") + Math.abs(value) + "°"; }

export function ColdStorage() {
  const [index, setIndex] = useState(0);
  const { values } = logs[index];
  const high = Number(maxElement(values.map(BigInt)));
  return <main className="bg-sky-100 text-sky-950">
    <div className="mx-auto max-w-7xl px-5 sm:px-9">
      <BenchNav name="Cold Storage" source={fixtureRoot + "max-element.proof.ts"} />
      <header className="flex flex-wrap items-end justify-between gap-3 py-5 sm:py-8">
        <h1 className="max-w-xl text-5xl leading-none font-black tracking-tighter sm:text-7xl">How warm did it get?</h1>
        <p className="max-w-xs text-base leading-snug">A maximum has to be one of the readings. See what happens when they all fall below zero.</p>
      </header>
      <section className="grid overflow-hidden rounded-xl border-4 border-sky-950 bg-sky-950 text-sky-50 sm:grid-cols-5">
        <div className="grid place-items-center gap-3 bg-ink px-4 py-8 sm:col-span-3 lg:py-12">
          <h2 className="font-mono text-xs font-bold tracking-widest text-sky-200 uppercase">Highest reading / °C</h2>
          <output aria-live="polite" className="font-pixel text-9xl leading-none font-bold tracking-tighter tabular-nums text-sky-100 sm:text-9xl">{temperature(high)}</output>
          <span className="font-mono text-sm text-sky-300">{values.length ? "maxElement(readings)" : "empty-list default"}</span>
        </div>
        <div className="border-t-2 border-sky-300 p-5 sm:col-span-2 sm:border-t-0 sm:border-l-2">
          <h3 className="mb-3 border-b border-sky-200/50 pb-2 font-mono text-xs tracking-widest uppercase">Temperature log</h3>
          {values.length ? <ol className="divide-y divide-sky-200/30">{values.map((v,i) => <li key={v} className="flex items-baseline justify-between py-1.5 font-mono"><span className="text-xs text-sky-200">{String(i*2).padStart(2, "0")}:00</span><strong className={v===high ? "text-xl text-amber-300" : "text-xl"}>{temperature(v)}</strong></li>)}</ol> : <p className="py-6 font-mono text-sm">No readings recorded.</p>}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <fieldset className="flex flex-wrap gap-2"><legend className="sr-only">Choose a temperature log</legend>{logs.map((log,i) => <button type="button" key={log.title} aria-pressed={index===i} onClick={()=>setIndex(i)} className={`${control} rounded-full border border-sky-950 px-4 text-sm font-semibold aria-pressed:bg-sky-950 aria-pressed:text-white`}>{log.title}</button>)}</fieldset>
        <a href={fixtureRoot + "max-element.proof.ts"} className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">See Pud’s bigint maximum proof ↗</a>
      </div>
    </div>
  </main>;
}
