"use client";

import { useState } from "react";
import { alphaEntryPath } from "@/lib/links";

import { admit, sameParity } from "./fixtures";
import { fixtureRoot as examples } from "../bench-ui";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-3";
const plugs = [0, 1, 2, 3];

function SocketBank({ name, value, select, below = false }: { name: string; value: number; select: (value: number) => void; below?: boolean }) {
  return <fieldset>
    <legend className={below ? "sr-only" : "mb-2 font-mono text-xs font-bold uppercase tracking-wider"}>{name}</legend>
    <div className="grid grid-cols-4 gap-1">
      {plugs.map(number => <button key={number} type="button" aria-label={`${name} ${number}`} aria-pressed={value === number} onClick={() => select(number)}
        className={`group inline-flex min-h-12 cursor-pointer items-center justify-start gap-1 rounded-md font-mono text-xs font-bold hover:bg-stone-300 aria-pressed:bg-yellow-200 ${below ? "flex-col" : "flex-col-reverse"} ${focus}`}>
        <span aria-hidden="true" className="block size-5 rounded-full border-4 border-neutral-400 bg-neutral-950 shadow-inner group-aria-pressed:border-red-800 group-aria-pressed:bg-red-500" />{number}n
      </button>)}
    </div>
    {below && <p aria-hidden="true" className="mt-2 font-mono text-xs font-bold uppercase tracking-wider">{name}</p>}
  </fieldset>;
}

export function PatchPanel() {
  const [left, setLeft] = useState(1);
  const [right, setRight] = useState(3);
  const match = sameParity(BigInt(left), BigInt(right));
  const from = (left + 0.5) * 100;
  const to = (right + 0.5) * 100;
  return (
    <main className="min-h-screen bg-violet-100 text-violet-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <nav aria-label="Patch Panel" className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-900 py-2">
          <a href="/" className={`inline-flex min-h-11 items-center gap-2 text-xl font-black tracking-tighter ${focus}`}><span aria-hidden="true" className="text-red-700">∿</span> Pud Patch Panel</a>
          <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center font-mono text-xs underline underline-offset-4 ${focus}`}>Join the alpha ↗</a>
        </nav>
        <section className="grid items-center gap-7 py-8 sm:py-12 lg:grid-cols-12 lg:gap-12" aria-labelledby="patch-heading">
          <header className="lg:col-span-5">
            <p className="mb-3 font-mono text-xs font-bold uppercase tracking-widest text-violet-800">The parity patch</p>
            <h1 id="patch-heading" className="font-serif text-7xl leading-none tracking-tighter sm:text-8xl xl:text-9xl">Do they<br /><em>agree?</em></h1>
            <p className="mt-5 max-w-sm text-lg leading-snug">Pick two nonnegative integers. Both odd or both even lights the signal. Pud checks the rule for the TypeScript function behind the panel.</p>
          </header>
          <div className="min-w-0 overflow-hidden rounded-3xl border-2 border-violet-950 bg-stone-200 text-neutral-950 shadow-lg lg:col-span-7">
            <div className="grid grid-cols-2 items-center gap-3 border-b-2 border-violet-950 bg-violet-950 px-4 py-3 text-violet-50 sm:px-6">
              <h2 className="font-mono text-sm font-bold">sameParity</h2>
              <output aria-live="polite" className={`justify-self-end rounded-md border px-2 py-1 font-mono text-sm ${match ? "border-lime-300 bg-lime-300 text-neutral-950" : "border-violet-300 text-violet-100"}`}>{match ? "● TRUE" : "○ FALSE"}</output>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <SocketBank name="Left input" value={left} select={setLeft} />
              <svg viewBox="0 0 400 66" preserveAspectRatio="none" aria-hidden="true" className="block h-15 w-full overflow-visible">
                <path d={`M ${from} 0 C ${from} 68, ${to} -2, ${to} 66`} fill="none" className="stroke-stone-400" strokeWidth="8" transform="translate(1,2)" />
                <path d={`M ${from} 0 C ${from} 68, ${to} -2, ${to} 66`} fill="none" className="stroke-red-600" strokeWidth="7" />
                <path d={`M ${from} 0 C ${from} 68, ${to} -2, ${to} 66`} fill="none" className="stroke-red-400" strokeWidth="1.5" />
              </svg>
              <SocketBank name="Right input" value={right} select={setRight} below />
            </div>
            <div className="border-t border-stone-400 px-4 py-3 font-mono text-sm sm:px-6">{left} is {left % 2 ? "odd" : "even"}. {right} is {right % 2 ? "odd" : "even"}.</div>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-900 py-3 text-sm">
          <code>left % 2n === right % 2n</code>
          <a href={examples + "same-parity.proof.ts"} className={`inline-flex min-h-11 items-center font-bold underline underline-offset-4 ${focus}`}>Read the parity proof ↗</a>
        </footer>
      </div>
    </main>
  );
}

function AdmissionKey({ engaged, name, off, on, toggle }: { engaged: boolean; name: string; off: string; on: string; toggle: () => void }) {
  return <button type="button" aria-label={name} aria-pressed={engaged} onClick={toggle}
    className={`flex min-h-24 w-full cursor-pointer items-center gap-3 border-b border-emerald-950/50 py-2 text-left hover:bg-emerald-100 sm:gap-5 ${focus}`}>
    <span aria-hidden="true" className="relative grid size-16 shrink-0 place-items-center rounded-full border-4 border-emerald-950 bg-stone-300 shadow-md">
      <span className={`relative flex h-3 w-12 items-center rounded-r-sm bg-emerald-950 ${engaged ? "-rotate-42" : "rotate-42"} motion-safe:transition-transform`}>
        <span className="absolute -left-1 size-6 rounded-md border-5 border-emerald-950 bg-amber-300" />
        <span className="absolute right-1 -bottom-1.5 h-3 w-1.5 bg-emerald-950" />
      </span>
    </span>
    <span><b className="block text-lg tracking-tight sm:text-xl">{name}</b><span className="mt-0.5 block font-mono text-xs">{engaged ? on : off}</span></span>
  </button>;
}

export function TwoKeys() {
  const [space, setSpace] = useState(true);
  const [batchReady, setBatchReady] = useState(false);
  const used = space ? 12 : 16;
  const batch = batchReady ? 4 : 0;
  const admitted = admit(BigInt(used), BigInt(batch));
  return (
    <main className="min-h-screen bg-emerald-950 text-emerald-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <nav aria-label="Two Keys" className="flex items-center justify-between gap-3 border-b border-emerald-300/50 py-2">
          <a href="/" className={`inline-flex min-h-11 items-center gap-2 font-black tracking-tight ${focus}`}><img src="/pud.svg" alt="" width={32} height={32} className="size-8" /> Pud Admissions</a>
          <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center font-mono text-xs underline underline-offset-4 ${focus}`}>Join the alpha ↗</a>
        </nav>
        <header className="mx-auto max-w-3xl pt-7 pb-5 text-center sm:pt-10">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-200">The sixteen-place gate</p>
          <h1 className="mt-2 font-serif text-6xl leading-none tracking-tighter text-amber-100 sm:text-8xl">Room for four?</h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-emerald-50 sm:text-lg">A batch needs space and at least one item. Turn the two keys to see when Pud’s TypeScript admission rule opens the gate.</p>
        </header>
        <section aria-label="Admission controls" className="mx-auto mb-8 grid max-w-5xl overflow-hidden rounded-2xl border-4 border-emerald-900 bg-amber-50 text-emerald-950 shadow-xl md:grid-cols-12">
          <div className="p-4 sm:p-7 md:col-span-7">
            <AdmissionKey engaged={space} name="Leave four places" off="16 places used" on="12 places used" toggle={() => setSpace(!space)} />
            <AdmissionKey engaged={batchReady} name="Send four items" off="Empty batch" on="Batch of four" toggle={() => setBatchReady(!batchReady)} />
            <div className="mt-5 grid grid-cols-8 gap-1" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => <span key={i + 1} className={`h-4 rounded-t-md border border-emerald-900 ${i < used ? "bg-emerald-800" : "bg-amber-100"}`} />)}
            </div>
            <p className="mt-2 font-mono text-xs">{used} of 16 places occupied</p>
          </div>
          <div className="flex flex-col justify-center border-t-2 border-dashed border-emerald-950/50 bg-amber-200 p-5 sm:p-7 md:col-span-5 md:border-t-0 md:border-l-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest">Admission ticket</p>
            <output aria-live="polite" className="block">
              <b className={`my-3 block text-5xl leading-none font-black tracking-tighter sm:text-6xl ${admitted ? "text-emerald-800" : "text-red-800"}`}>{admitted ? "ADMIT" : "HOLD"}</b>
              <span className="block text-sm font-semibold">{!batchReady ? "The batch is empty." : admitted ? "All four items fit." : "Four items exceed the quota."}</span>
              <code className="mt-3 block text-xs">admit({used}n, {batch}n) → {String(admitted)}</code>
            </output>
          </div>
        </section>
        <footer className="flex justify-center border-t border-emerald-300/50 py-2">
          <a href={examples + "admit.proof.ts"} className={`inline-flex min-h-11 items-center font-mono text-xs text-emerald-100 underline underline-offset-4 ${focus}`}>Read both admission properties ↗</a>
        </footer>
      </div>
    </main>
  );
}
