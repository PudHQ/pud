"use client";

import { useState } from "react";
import { low64, shiftWide } from "./fixtures";
import { AlphaLink, art, caps, control, example, ProofLink, PudHome } from "./shared";

const inputs = ["-1", "2", "18446744073709551617"];
const jobs = [
  { name: "Mask", spec: "Extract the low 64 bits.", code: "value & 0xffffffffffffffffn", source: "low-64.proof.ts", machine: low64 },
  { name: "Shift", spec: "Move the value left by 70 bits.", code: "value << 70n", source: "shift-wide.proof.ts", machine: shiftWide },
] as const;

export function PartsCounter() {
  const [job, setJob] = useState(0);
  const [stock, setStock] = useState(0);
  const part = jobs[job];
  const output = part.machine(BigInt(inputs[stock]));
  return (
    <main className="min-h-screen bg-blue-950 p-3 text-blue-950 sm:p-6">
      <div className="mx-auto max-w-7xl border border-blue-300 bg-blue-50">
        <header className="flex items-center justify-between border-b border-blue-900 px-4 sm:px-7"><PudHome name="Parts Counter" /><AlphaLink /></header>
        <div className="grid lg:grid-cols-12">
          <section className="min-w-0 border-b border-blue-900 lg:col-span-7 lg:border-r lg:border-b-0">
            <div className="px-4 pt-6 pb-3 sm:px-7">
              <p className={caps}>Pud / Machine shop</p>
              <h1 className="mt-3 font-serif text-5xl leading-none tracking-tighter sm:text-7xl lg:text-8xl">Parts Counter</h1>
              <p className="mt-3 mb-2 max-w-xl text-lg">Two tools for a signed bigint. Specify the cut.</p>
            </div>
            <figure className="border-t border-blue-900 bg-blue-800 text-blue-50">
              <img src={`${art}/parts-counter.webp`} alt="Exploded blueprint of an eight-drum mechanical calculator" width="1440" height="720" fetchPriority="high" className="aspect-2/1 w-full object-cover lg:aspect-3/2" />
              <figcaption className="border-t border-blue-300/60 px-4 py-2 font-mono text-xs sm:px-7">Assembly drawing / counting register</figcaption>
            </figure>
          </section>
          <section aria-labelledby="job-title" className="min-w-0 bg-stone-50 px-4 py-6 sm:px-7 lg:col-span-5 lg:flex lg:flex-col lg:justify-center">
            <h2 id="job-title" className="border-y-4 border-double border-blue-950 py-2 font-mono text-lg font-bold uppercase">Machining order</h2>
            <fieldset className="mt-5">
              <legend className={caps}>Operation</legend>
              <div className="mt-2 flex gap-2">{jobs.map((entry, index) => <button type="button" aria-pressed={job === index} key={entry.name} onClick={() => setJob(index)} className={`${control} grow border border-blue-900 px-3 py-1 text-left font-mono aria-pressed:bg-blue-900 aria-pressed:text-white hover:underline`}>{entry.name} <span className="text-sm">{index === 0 ? "/ 64" : "/ 70"}</span></button>)}</div>
            </fieldset>
            <label htmlFor="parts-stock" className={`${caps} mt-5 block`}>Input stock</label>
            <select id="parts-stock" value={stock} onChange={event => setStock(Number(event.target.value))} className="mt-2 min-h-11 w-full border border-blue-900 bg-white px-3 font-mono">{inputs.map((input, index) => <option key={input} value={index}>{input}n</option>)}</select>
            <div aria-live="polite" className="mt-5 border-y border-blue-900 py-3">
              <p className={caps}>Finished part</p><p className="mt-1 break-all font-mono text-xl font-bold sm:text-2xl">{output.toString()}n</p>
              <p className="mt-2">{part.spec}</p>
              <code className="block break-words text-sm">{part.code}</code>
            </div>
            <div className="mt-4"><p className="text-sm">Pud checks this operation against its arithmetic rule for every signed bigint.</p><ProofLink href={`${example}/${part.source}`} /></div>
          </section>
        </div>
      </div>
    </main>
  );
}
