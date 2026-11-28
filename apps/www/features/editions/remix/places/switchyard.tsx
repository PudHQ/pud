"use client";

import { useState } from "react";
import { partsOrEmpty } from "./fixtures";
import { AlphaLink, art, caps, control, example, ProofLink, PudHome } from "./shared";

const cars = [{ type: "tool-call", toolCallId: "A" }, { type: "tool-result", toolCallId: "B" }];
const loads = [
  { label: "Two parts", content: cars },
  { label: "Plain text", content: "arrival" },
  { label: "Reversed parts", content: [...cars].reverse() },
] as const;

export function Switchyard() {
  const [selection, setSelection] = useState(0);
  const selected = loads[selection];
  const output = partsOrEmpty(selected.content);
  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-950">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-5">
        <header className="flex items-center justify-between border-b-2 border-emerald-900 bg-orange-50 px-4 sm:px-7"><PudHome name="Switchyard" /><AlphaLink /></header>
        <section className="bg-orange-50">
          <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-5 pb-3 sm:px-7">
            <h1 className="text-5xl leading-none font-black tracking-tighter sm:text-7xl lg:text-8xl">Switchyard<span className="text-orange-600">.</span></h1>
            <p className="max-w-72 leading-snug sm:pb-2">Route a TypeScript union. Keep every car in order.</p>
          </div>
          <img src={`${art}/switchyard.webp`} alt="A switch operator watches a green locomotive and orange freight cars cross the yard" width="1440" height="720" fetchPriority="high" className="h-48 w-full border-y-2 border-emerald-900 object-cover sm:h-68 lg:h-80" />
        </section>
        <section aria-labelledby="dispatch-board" className="grid border-b-8 border-orange-500 bg-emerald-900 text-orange-50 md:grid-cols-2">
          <fieldset className="min-w-0 border-b border-emerald-700 px-4 py-5 sm:px-7 md:border-r md:border-b-0">
            <legend className="sr-only">Incoming content</legend>
            <h2 id="dispatch-board" className={caps}>Inbound manifest</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {loads.map((load, index) => <button type="button" key={load.label} aria-pressed={selection === index} onClick={() => setSelection(index)} className={`${control} border border-emerald-300 px-3 font-mono text-sm aria-pressed:border-orange-300 aria-pressed:bg-orange-300 aria-pressed:text-emerald-950 hover:underline`}>{load.label}</button>)}
            </div>
          </fieldset>
          <div aria-live="polite" className="px-4 py-5 sm:px-7">
            <p className={caps}>Outbound parts</p>
            <p className="mt-3 flex min-h-11 flex-wrap items-center gap-2 font-mono text-lg font-bold">
              {output.length ? output.map(part => <span key={part.toolCallId} className="border-b-4 border-orange-300 bg-emerald-950 px-3 py-1">{part.toolCallId} · {part.type}</span>) : <span className="bg-emerald-950 px-3 py-1">[] · empty train</span>}
            </p>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-x-5 px-1 pt-3 text-orange-50">
          <p className="max-w-2xl">Pud checks that text yields an empty list and arrays keep every part in its original position.</p>
          <ProofLink href={`${example}/content-dispatch.proof.ts`} />
        </div>
      </div>
    </main>
  );
}
