"use client";

import { useState } from "react";
import { nestedSum } from "../../../../../packages/pud/.examples/nested-loop-invariants";
import { BenchNav, control, fixtureRoot } from "./bench-ui";

const threads = ["bg-indigo-800", "bg-orange-600", "bg-fuchsia-800", "bg-amber-500", "bg-emerald-700", "bg-sky-700", "bg-pink-700", "bg-stone-800"];
export function LoopLoom() {
  const [size, setSize] = useState(5);
  const labels = Array.from({length: size}, (_,i) => i + 1);
  const visits = nestedSum(labels.map(BigInt));
  return <main className="bg-orange-50 text-indigo-950">
    <div className="mx-auto max-w-7xl px-5 sm:px-9">
      <BenchNav name="Loop Loom" source={fixtureRoot + "nested-loop-invariants.proof.ts"} />
      <div className="grid items-center gap-6 py-6 sm:py-8 md:grid-cols-2 lg:gap-16">
        <section>
          <h1 className="font-serif text-7xl leading-none tracking-tighter sm:text-8xl xl:text-9xl">A loop<br /><em>in a loop.</em></h1>
          <p className="mt-4 max-w-sm text-lg leading-snug">Both loops traverse the same list. Each crossing is one visit. Add a thread and count what changes.</p>
          <div className="mt-6 flex w-fit items-center border-y-2 border-indigo-950 py-2">
            <button type="button" aria-label="Remove a thread" disabled={size===2} onClick={()=>setSize(size-1)} className={`${control} min-w-12 text-3xl font-semibold disabled:opacity-35`}>−</button>
            <span className="px-4 font-mono text-sm">{size} threads</span>
            <button type="button" aria-label="Add a thread" disabled={size===8} onClick={()=>setSize(size+1)} className={`${control} min-w-12 text-3xl font-semibold disabled:opacity-35`}>+</button>
          </div>
          <p className="mt-4 font-mono text-sm">Pud / TypeScript nestedSum</p>
        </section>
        <figure className="mx-auto w-full max-w-lg">
          <div className="border-x-8 border-y-12 border-amber-800 bg-orange-100 px-1 py-2 shadow-lg sm:px-3">
            <div className="grid aspect-square" style={{gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`}} aria-hidden="true">
              {labels.flatMap(row => labels.map(col => (
                <div key={`${row}-${col}`} className="relative flex items-center justify-center">
                  <i className={`absolute inset-y-0 w-4/5 border-x-4 border-double border-white/60 ${threads[col-1]}`} />
                  <i className={`absolute inset-x-0 h-4/5 border-y-4 border-double border-white/60 ${threads[row-1]}`} />
                  {(row+col)%2 === 0 && <i className={`absolute inset-y-0 w-4/5 border-x-4 border-double border-white/60 shadow-md ${threads[col-1]}`} />}
                </div>
              )))}
            </div>
          </div>
          <figcaption className="mt-3 flex items-baseline justify-between border-b border-indigo-950 pb-2 font-mono text-xs uppercase"><span>Ordered pairs</span><output className="text-lg font-bold">{size} × {size} = {visits.toString()} visits</output></figcaption>
        </figure>
      </div>
      <p className="max-w-2xl border-t border-indigo-950 py-5 text-base">The sidecar asks Lean to prove <code>total = length × length</code> for every dense bigint list in the model.</p>
    </div>
  </main>;
}
