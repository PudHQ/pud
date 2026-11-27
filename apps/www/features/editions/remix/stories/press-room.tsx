"use client";

import { useState } from "react";
import { debit } from "../../../../../../packages/pud/.examples/debit.ts";
import { secondsToMilliseconds } from "../../../../../../packages/pud/.examples/motion/time-conversion.ts";
import { action, artwork, blob, example, Imprint, sourceLink } from "./imprint";

export function Errata() {
  const [corrected, setCorrected] = useState(false);
  const expected = secondsToMilliseconds(0.0015);
  const reported = corrected ? expected : Math.round(expected);
  return (
    <main className="min-h-screen bg-stone-100 px-4 pb-24 text-neutral-950 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <Imprint title="Corrections desk" />
        <article className="border-x border-stone-400">
          <header className="grid items-end gap-4 border-b border-stone-400 px-4 py-7 sm:px-8 lg:grid-cols-5 lg:py-10">
            <h1 className="font-sans text-7xl leading-none font-black tracking-tighter text-red-700 sm:text-8xl lg:col-span-3 lg:text-9xl">Errata<span className="text-ink">.</span></h1>
            <p className="max-w-sm border-l-4 border-red-700 pl-4 font-serif text-lg leading-tight sm:text-2xl lg:col-span-2">
              A half-millisecond lost in a TypeScript edit. One proof puts it back.
            </p>
          </header>
          <div className="grid items-stretch md:grid-cols-5">
            <section aria-label="Source proof" className="relative flex flex-col justify-between gap-8 bg-white p-5 sm:p-8 md:col-span-3 lg:p-11">
              <p className="border-b border-dashed border-stone-400 pb-3 font-mono text-xs uppercase tracking-widest">Galley / time-conversion.ts</p>
              <div className="space-y-2">
                <p className="font-mono text-sm text-stone-600">secondsToMilliseconds</p>
                <p className="break-words font-mono text-2xl leading-snug font-bold tracking-tight sm:text-4xl">
                  {corrected ? "seconds * 1000" : <><s className="decoration-red-600 decoration-4">Math.round(</s><br />seconds * 1000<s className="decoration-red-600 decoration-4">)</s></>}
                </p>
                <p className="-rotate-3 origin-left pt-2 font-serif text-2xl font-bold italic text-red-700 sm:text-3xl">
                  {corrected ? "Corrected for press." : "dele rounding!"}
                </p>
              </div>
              <p className="font-mono text-xs text-stone-600">Regression specimen · Pud’s Motion tests</p>
            </section>
            <section aria-label="Correction proof" className="flex min-w-0 flex-col justify-between gap-5 bg-red-700 px-5 py-6 text-white sm:p-8 md:col-span-2 lg:p-10">
              <p className="font-mono text-sm">Input　0.0015 sec</p>
              <div role="status" aria-atomic="true">
                <p className="text-6xl leading-none font-black tracking-tighter sm:text-8xl">{reported}<span className="ml-2 text-3xl font-medium">ms</span></p>
                <p className="mt-2 font-serif text-lg italic">{corrected ? "Fraction preserved." : "Expected 1.5 ms."}</p>
              </div>
              <button type="button" onClick={() => setCorrected(!corrected)} className={`${action} self-start bg-white text-red-800 hover:bg-red-50`}>
                {corrected ? "Restore misprint" : "Apply correction"} <span aria-hidden="true">{corrected ? "↶" : "↗"}</span>
              </button>
            </section>
          </div>
          <footer className="grid items-center gap-2 border-y border-stone-400 px-5 py-3 sm:px-8 md:grid-cols-5 md:gap-6">
            <p className="max-w-2xl font-serif text-base leading-snug md:col-span-3">
              In Pud’s regression test, adding <code>Math.round</code> breaks the exact unit rule. Lean checks the original conversion over JavaScript numbers in Pud’s model.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 md:col-span-2 md:justify-self-end">
              <a href="/editions/remix/machines/motion-license.txt" className="inline-flex min-h-11 items-center text-xs underline underline-offset-2">Motion source notice</a>
              <a href={`${blob}/test/number.test.ts#L36`} className={sourceLink}>Read the regression ↗</a>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}

const charges = [
  { label: "Charge 4", amount: 4 },
  { label: "Over budget", amount: 12 },
  { label: "Zero amount", amount: 0 },
];

const startingBalance = 10;

function DebitSlip({ title, amount, closing, className }: { title: string; amount: number; closing: number; className: string }) {
  const deducted = startingBalance - closing;
  return (
    <article className={`relative grid shrink-0 gap-4 border border-blue-950/60 p-4 shadow-xl sm:p-5 ${className}`}>
      <header className="border-b-2 border-blue-950/70 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
        <h3 className="mt-1 font-serif text-3xl font-bold tracking-tight">Debit slip</h3>
      </header>
      <dl className="grid grid-cols-2 gap-y-2 text-xs tabular-nums sm:text-sm">
        <dt>Opening</dt><dd className="text-right">{startingBalance}.00</dd>
        <dt>Requested</dt><dd className="text-right">{amount}.00</dd>
        <dt>Deducted</dt><dd className="text-right">{deducted}.00</dd>
      </dl>
      <div className="border-t border-dashed border-blue-950/60 pt-2">
        <p className="text-xs">Closing balance</p>
        <p className="mt-1 text-4xl font-bold tracking-tighter tabular-nums">{closing}.00</p>
      </div>
    </article>
  );
}

export function CarbonCopy() {
  const [selected, setSelected] = useState(0);
  const charge = charges[selected];
  const closing = Number(debit(BigInt(startingBalance), BigInt(charge.amount)));
  return (
    <main className="min-h-screen bg-blue-950 px-4 pb-24 text-amber-50 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Imprint title="Accounts department" />
        <div className="grid items-center gap-x-9 gap-y-9 py-10 sm:py-14 lg:grid-cols-12 lg:py-20">
          <section className="lg:col-span-5">
            <h1 className="font-serif text-7xl leading-none tracking-tighter sm:text-8xl lg:text-7xl xl:text-9xl">Carbon<br /><i className="text-blue-200">copy.</i></h1>
            <p className="mt-5 max-w-sm text-lg leading-snug text-blue-100">Enter a charge. Keep both copies. Pud checks how much your TypeScript can take from a balance.</p>
            <fieldset className="mt-6">
              <legend className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-blue-200">Issue a debit slip</legend>
              <div className="flex flex-wrap gap-1.5">
                {charges.map((option, index) => <button type="button" key={option.label} onClick={() => setSelected(index)} aria-pressed={index === selected}
                  className={`${action} border border-blue-300/70 px-3 font-mono text-xs hover:bg-blue-800 aria-pressed:bg-blue-100 aria-pressed:text-blue-950`}>{option.label}</button>)}
              </div>
            </fieldset>
          </section>
          <section aria-label="Customer and ledger copies" className="min-w-0 border-y border-blue-300/50 py-5 lg:col-span-7">
            <div className="mb-5 flex items-center justify-between gap-2 font-mono text-xs text-blue-100">
              <span>pud / debit.ts</span><span>Original + duplicate</span>
            </div>
            <div className="grid items-center gap-2 px-1 py-3 font-mono text-blue-950 sm:grid-cols-2 sm:gap-0 sm:px-4">
              <DebitSlip title="Customer copy" amount={charge.amount} closing={closing} className="z-10 -rotate-1 bg-amber-100 sm:-rotate-3" />
              <DebitSlip title="Ledger copy" amount={charge.amount} closing={closing} className="rotate-1 bg-rose-200 sm:-ml-2 sm:translate-y-4 sm:rotate-3" />
            </div>
            <p role="status" className="mt-6 font-mono text-sm text-blue-100">Balance {startingBalance} → {closing}. {closing < startingBalance ? "The full charge was deducted." : "No deduction."}</p>
          </section>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-300/50 py-3">
          <p className="max-w-2xl font-serif text-lg leading-snug">For every nonnegative opening balance, the proved result stays between zero and the opening balance.</p>
          <a href={`${example}/debit.proof.ts`} className={sourceLink}>Inspect the debit laws ↗</a>
        </div>
      </div>
    </main>
  );
}

export function MarginCall() {
  const [exact, setExact] = useState(false);
  return (
    <main className="min-h-screen bg-stone-200 px-3 pb-24 text-stone-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Imprint title="Working papers" />
        <article className="relative mx-auto mt-5 max-w-5xl bg-amber-50 px-4 py-7 shadow-md sm:mt-8 sm:px-10 sm:py-9">
          <header className="grid items-center gap-3 md:grid-cols-5 md:gap-6">
            <div className="md:col-span-3">
              <p className="font-mono text-xs uppercase tracking-widest text-violet-800">Notes on exact results</p>
              <h1 className="mt-2 font-serif text-5xl leading-none tracking-tighter sm:text-7xl lg:text-8xl">Room in the margin.</h1>
              <p className="mt-3 max-w-xl font-serif text-xl leading-snug">The identity function returns its input. How much of that promise does “at least” capture?</p>
            </div>
            <img src={`${artwork}/calipers.webp`} fetchPriority="high" width={720} height={480}
              alt="A notebook sketch of Pud opening a pair of calipers around a single point"
              className="mx-auto w-4/5 max-w-80 rotate-2 mix-blend-multiply brightness-110 md:col-span-2 md:w-full" />
          </header>
          <div className="mt-6 grid gap-4 border-y border-stone-400/70 py-6 sm:mt-8 md:grid-cols-5 md:gap-7">
            <div className="min-w-0 md:col-span-3">
              <p className="font-mono text-xs text-stone-600">id.proof.ts　/　working assertion</p>
              <p className="my-3 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">{exact ? <><i>x</i> ≤ result <u className="decoration-violet-600 decoration-2 underline-offset-8">≤ <i>x</i></u></> : <>result ≥ <i>x</i></>}</p>
              <code className="block break-words font-mono text-xs sm:text-sm">{exact ? "pud.bigint().gte(x).lte(x)" : "pud.bigint().gte(x)"}</code>
              <p className="mt-5 max-w-sm font-serif text-base leading-snug">At <code>x = 0n</code>, the function returns <code>0n</code>. Ask Pud whether the rule permits any other result.</p>
              <button type="button" onClick={() => setExact(!exact)} aria-pressed={exact} className={`${action} mt-3 border-b-2 border-violet-800 px-0 text-violet-900 hover:text-violet-700`}>
                {exact ? "Remove upper bound" : "Add upper bound"} <span aria-hidden="true">{exact ? "−" : "+"}</span>
              </button>
            </div>
            <aside className="border-l-2 border-violet-600/60 pl-4 text-violet-900 md:col-span-2 md:pl-6">
              <p className="font-serif text-2xl font-bold italic">In the margin</p>
              <div role="status" className="mt-2">
                <p className="font-serif text-xl italic">{exact ? "Only 0n fits." : "1n fits, too!"}</p>
                <p className="mt-2 text-sm leading-snug">{exact ? "The upper and lower limits coincide. The rule determines the return value for every signed bigint." : "0n and 1n both satisfy this lower bound. It proves an invariant and leaves the exact answer open."}</p>
                <p className="mt-3 inline-block -rotate-3 border-2 border-current px-2 py-1 font-mono text-xs font-bold uppercase">{exact ? "Unique result" : "Second answer"}</p>
              </div>
            </aside>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="font-serif text-sm italic">A TypeScript proof checked with Lean.</p>
            <a href={`${blob}/test/number.test.ts#L100`} className={sourceLink}>See the exact-result checks ↗</a>
          </footer>
        </article>
      </div>
    </main>
  );
}
