"use client";

import { useState } from "react";
import { alphaEntryPath } from "@/lib/links";

import { arraySum, low64 } from "./fixtures";
import { fixtureRoot as examples } from "../bench-ui";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-3";
const tape = [8, -3, 5, -2].map(BigInt);
const completeSum = arraySum(tape);
const bitIndices = [7, 6, 5, 4, 3, 2, 1, 0];
const signedByte = (value: number) => BigInt.asIntN(8, BigInt(value));

function Perforations() {
  return <div aria-hidden="true" className="flex justify-around gap-1 py-1.5">
    {[0, 1, 2, 3, 4].map(hole => <i key={hole} className="size-1.5 rounded-full bg-teal-950 sm:size-2.5" />)}
  </div>;
}

export function TapeSplice() {
  const [cut, setCut] = useState(2);
  const leftSum = arraySum(tape.slice(0, cut));
  const rightSum = arraySum(tape.slice(cut));
  return (
    <main className="min-h-screen bg-paper text-teal-950">
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 border-b border-teal-950/50 px-4 py-1 sm:px-8">
        <a className={`inline-flex min-h-11 items-center gap-2 text-lg font-bold tracking-tight ${focus}`} href="/">Pud <span className="font-serif font-normal italic">Tape Works</span></a>
        <a className={`inline-flex min-h-11 items-center font-mono text-xs underline underline-offset-4 ${focus}`} href={alphaEntryPath}>Join the alpha ↗</a>
      </header>
      <div className="mx-auto grid max-w-7xl items-center gap-2 px-4 pt-7 pb-4 sm:px-8 md:grid-cols-2 md:gap-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-red-800">Array sum / TypeScript</p>
          <h1 className="mt-3 font-serif text-6xl leading-none tracking-tighter sm:text-7xl lg:text-8xl">Split the tape.<br /><em className="text-teal-800">Keep the sum.</em></h1>
          <p className="mt-4 max-w-sm text-base leading-snug sm:text-lg">Pud proves a loop adds every bigint on its tape. Cut this one anywhere and see what each side contributes.</p>
        </div>
        <img src="/editions/remix/machines/tape-reader.webp" alt="Pud feeding a ribbon of punched tape through a teal adding machine" width={1200} height={800} fetchPriority="high" className="mx-auto w-full max-w-72 mix-blend-multiply sm:max-w-100 md:max-w-130" />
      </div>
      <section aria-label="Paper tape splicer" className="border-y-4 border-teal-950 bg-teal-900 py-5 text-paper md:py-7">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
            <label htmlFor="splice-cut" className="text-sm font-semibold">Slide the splice point</label>
            <span>4 cells · bigint tape</span>
          </div>
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            {tape.map((value, index) => <div key={String(value)} className={`min-w-0 border-dashed border-teal-950 px-1 text-teal-950 ${index < cut ? "bg-yellow-100" : "bg-teal-100"} ${index === cut ? "border-l-4 sm:ml-2" : ""}`}>
              <Perforations />
              <div className="border-y border-teal-950/30 py-2 text-center">
                <p className="font-mono text-2xl leading-none font-bold sm:text-4xl">{value > 0 ? "+" : ""}{String(value)}</p>
                <p className="mt-1 font-mono text-xs">Σ {String(arraySum(tape.slice(0, index + 1)))}</p>
              </div>
              <Perforations />
            </div>)}
          </div>
          <div className="mt-2 grid items-center gap-x-8 md:grid-cols-2">
            <input id="splice-cut" type="range" min={0} max={tape.length} step={1} value={cut} onChange={event => setCut(Number(event.target.value))} aria-valuetext={`After ${cut} cells`} className={`h-11 w-full cursor-pointer accent-yellow-200 ${focus}`} />
            <output htmlFor="splice-cut" aria-live="polite" className="font-mono text-base text-amber-100 md:text-right">Left {String(leftSum)} + right {String(rightSum)} = <strong>{String(completeSum)}</strong></output>
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 px-4 py-3 font-mono text-xs sm:px-8">
        <code>arraySum(values) = sum(values)</code>
        <a href={examples + "array-sum.proof.ts"} className={`inline-flex min-h-11 items-center font-bold underline underline-offset-4 ${focus}`}>Read the proof ↗</a>
      </footer>
    </main>
  );
}

export function BitPress() {
  const [draft, setDraft] = useState(250);
  const [impression, setImpression] = useState(draft);
  const unsigned = low64(signedByte(impression));
  const hex = unsigned.toString(16).toUpperCase().padStart(16, "0");
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-9 lg:px-14">
        <nav aria-label="Bit Press" className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-600 py-2 font-mono text-sm">
          <a href="/" className={`flex min-h-11 items-center gap-2 font-bold ${focus}`}><span aria-hidden="true" className="bg-orange-500 p-1 text-black">▚</span> PUD / BIT PRESS</a>
          <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center underline underline-offset-4 ${focus}`}>Join the alpha ↗</a>
        </nav>
        <header className="grid items-end gap-y-4 py-7 sm:py-10 lg:grid-cols-12 lg:gap-8">
          <h1 className="text-6xl leading-none font-black tracking-tighter text-orange-400 sm:text-8xl lg:col-span-8 xl:text-9xl">Press the bits.</h1>
          <p className="max-w-sm text-base leading-snug text-neutral-300 lg:col-span-4">Set a signed byte, then stamp it through a 64-bit mask. Pud proves the same operation for every bigint.</p>
        </header>
        <section className="border-2 border-neutral-700 bg-stone-300 px-3 py-4 text-neutral-950 sm:p-6" aria-label="Bit press console">
          <fieldset>
            <legend className="pb-3 font-mono text-xs font-bold uppercase tracking-widest">Input / signed 8-bit</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {bitIndices.map(bit => {
                const active = (draft & (1 << bit)) !== 0;
                return <button key={bit} onClick={() => setDraft(draft ^ (1 << bit))} type="button" aria-label={`Bit ${bit}`} aria-pressed={active} className={`cursor-pointer rounded-md border border-black border-b-6 bg-stone-100 px-1 py-2 text-black shadow-md aria-pressed:border-orange-900 aria-pressed:bg-orange-400 hover:brightness-110 sm:py-3 ${focus}`}>
                  <span className="block font-mono text-xs">b{bit}</span>
                  <b className="mt-1 block font-mono text-3xl leading-none sm:text-5xl">{active ? 1 : 0}</b>
                </button>;
              })}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm">Signed input <b>{String(signedByte(draft))}n</b></span>
            <button type="button" onClick={() => setImpression(draft)} className={`min-h-11 cursor-pointer bg-neutral-950 px-5 font-mono text-sm font-bold text-white hover:bg-neutral-700 ${focus}`}>Stamp low 64 ↓</button>
          </div>
        </section>
        <section aria-label="Stamped output" className="mt-3 border-y border-orange-400 py-5 text-orange-400 sm:py-7">
          <p className="font-mono text-xs font-bold uppercase tracking-widest">Impression / unsigned 64-bit</p>
          <output aria-live="polite" className="mt-3 block font-mono">
            <span aria-hidden="true" className="grid grid-cols-4 gap-2 text-4xl leading-none tracking-tighter sm:grid-cols-8 sm:text-5xl lg:text-7xl">
              {bitIndices.map((bit, index) => <span key={bit}>{hex.slice(index * 2, index * 2 + 2)}</span>)}
            </span>
            <span className="sr-only">Hexadecimal {hex}. </span>
            <span className="mt-4 block break-all text-sm text-stone-300">{String(signedByte(impression))}n &amp; 0xffffffffffffffffn = {String(unsigned)}n</span>
          </output>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 py-3 font-mono text-xs text-stone-300">
          <span>The mask keeps the low 64 bits.</span>
          <a className={`inline-flex min-h-11 items-center font-bold underline underline-offset-4 ${focus}`} href={examples + "low-64.proof.ts"}>Read the TypeScript rule ↗</a>
        </footer>
      </div>
    </main>
  );
}
