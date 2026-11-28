"use client";

import { useState } from "react";
import results from "../../../../../experiments/compatibility/baseline.json";
import { BenchNav, control } from "./bench-ui";

const benchmark = "https://github.com/PudHQ/pud/tree/main/experiments/compatibility";
const marks = { addition: "+", subtraction: "−", division: "÷", multiplication: "×", modulus: "%", exponentiation: "**" } as const;
const baseline = results.arithmetic;
export function PressCheck() {
  const [index,setIndex] = useState(0);
  const group = baseline[index];
  const pending = new Set(group.unsupported);
  const matched = group.assertions - pending.size;
  return <main className="bg-paper text-ink">
    <div className="mx-auto max-w-7xl px-4 sm:px-9">
      <BenchNav name="Press Check" source={benchmark} />
      <header className="grid items-end gap-3 py-5 sm:grid-cols-12 lg:py-8">
        <h1 className="text-6xl leading-none font-black tracking-tighter sm:col-span-8 sm:text-7xl lg:text-8xl">Show every mark.</h1>
        <p className="max-w-sm text-sm leading-snug sm:col-span-4 sm:text-base">One square per assertion. Inspect Pud’s measured results on six bigint arithmetic files from Test262.</p>
      </header>
      <fieldset className="flex flex-wrap gap-1 border-y-2 border-ink py-2"><legend className="sr-only">Select an arithmetic file</legend>
        {baseline.map(({operator},i)=><button key={operator} type="button" aria-pressed={i===index} onClick={()=>setIndex(i)} className={`${control} flex items-center gap-2 px-2 font-mono text-xs font-semibold capitalize hover:underline aria-pressed:bg-ink aria-pressed:text-white sm:px-4`}><b aria-hidden="true" className="text-base">{marks[operator as keyof typeof marks]}</b>{operator}</button>)}
      </fieldset>
      <section className="grid items-start gap-4 py-5 md:grid-cols-12 lg:gap-8">
        <div className="min-w-0 md:col-span-4">
          <h2 className="font-mono text-xs font-semibold tracking-widest uppercase">Assertions matched</h2>
          <output className="mt-2 block text-6xl leading-none font-black tracking-tighter text-indigo-800 sm:text-7xl">{matched}<span className="text-3xl text-ink"> / {group.assertions}</span></output>
          <p className="mt-3 max-w-xs text-sm">{pending.size ? `${pending.size} unsupported in this file. The adapter cannot lower these expressions at this revision.` : "Every assertion in this file matched the upstream expected bigint."}</p>
        </div>
        <figure className="min-w-0 border border-ink bg-white p-3 md:col-span-8 sm:p-5">
          <div className="grid grid-cols-18 gap-1 sm:grid-cols-24" aria-hidden="true">
            {Array.from({length:group.assertions},(_,i)=><i key={i.toString()} className={`aspect-square ${pending.has(i+1) ? "border-2 border-orange-700 bg-orange-100" : "bg-indigo-800"}`} />)}
          </div>
          <figcaption className="mt-3 flex flex-wrap justify-between gap-2 border-t border-ink/40 pt-2 font-mono text-xs"><span>{group.operator}/bigint-arithmetic.js</span><span>Lean {results.lean}</span></figcaption>
        </figure>
      </section>
      <a href="https://dex.pud.dev/compatibility/tree/" className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4">Explore the coverage map ↗</a>
    </div>
  </main>;
}
