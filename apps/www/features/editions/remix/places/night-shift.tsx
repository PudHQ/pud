"use client";

import { useState } from "react";
import { countBatch, countFree, countFreeReference } from "./fixtures";
import { AlphaLink, art, caps, control, example, ProofLink, PudHome } from "./shared";

const left: bigint[] = [];
const right = [BigInt(1)];
const expected = countFreeReference(left, right);
const builds = [
  { expression: "countBatch(left)", actual: countBatch(left), name: "Dropped batch" },
  { expression: "countBatch(right) + countBatch(left)", actual: countFree(left, right), name: "Split tally" },
];

export function NightShift() {
  const [build, setBuild] = useState(0);
  const [decision, setDecision] = useState<"hold" | "ship" | null>(null);
  const revision = builds[build];
  const good = revision.actual === expected;
  const correct = decision === (good ? "ship" : "hold");
  return (
    <main className="min-h-screen bg-slate-950 text-amber-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1 font-pixel text-xl sm:px-8">
        <PudHome name="Night Shift" /><AlphaLink />
      </header>
      <section className="relative isolate mx-auto max-w-7xl overflow-hidden border-y border-violet-400/50 bg-indigo-950 sm:border">
        <img src={`${art}/night-shift.webp`} width="1440" height="720" alt="Pud under a desk lamp in the release office above a sleeping factory town" fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover object-right sm:object-center" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-slate-950/90 via-slate-950/45 to-transparent sm:via-transparent" />
        <div className="px-5 pt-12 pb-16 sm:px-10 sm:pt-16 sm:pb-20 lg:px-14 lg:py-24">
          <p className={`${caps} text-violet-200`}>Pud / release desk</p>
          <h1 className="mt-3 font-pixel text-7xl leading-none font-bold tracking-tight text-amber-100 sm:text-8xl lg:text-9xl">Night<br />Shift.</h1>
          <p className="mt-4 max-w-73 text-base leading-snug text-white sm:text-lg">A change to the scheduler just landed. Two batches in. One tally out. Do you ship it?</p>
        </div>
      </section>
      <section aria-labelledby="release-title" className="mx-auto grid max-w-7xl gap-x-12 gap-y-5 border-b border-slate-700 px-5 py-7 sm:px-10 lg:grid-cols-12 lg:px-14">
        <div className="lg:col-span-7">
          <p className={`${caps} text-violet-300`}>Release candidate {build + 1} of 2</p>
          <h2 id="release-title" className="mt-2 font-pixel text-3xl sm:text-4xl">Sign off the change.</h2>
          <code className="mt-3 block break-words border-l-2 border-amber-300 pl-3 font-mono text-sm leading-relaxed text-amber-200 sm:text-lg">return {revision.expression}</code>
          <p className="mt-3 font-mono text-sm">left = [] <span aria-hidden="true"> · </span> right = [1n]</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setDecision("hold")} className={`${control} border-2 border-amber-300 bg-amber-300 px-4 font-pixel text-lg text-slate-950 hover:bg-amber-200`}>Hold release</button>
            <button type="button" onClick={() => setDecision("ship")} className={`${control} border-2 border-violet-300 px-4 font-pixel text-lg text-violet-100 hover:bg-violet-950`}>Ship release</button>
          </div>
          {decision && <div role="status" className="mt-4 max-w-xl border-t border-slate-600 pt-3">
            <strong className="text-amber-200">{correct ? "Good call." : "Take another look."}</strong>{" "}
            {good ? "Both batches contribute." : "The second batch went missing."} Returned {String(revision.actual)}n. Expected {String(expected)}n.
            <button type="button" onClick={() => { setBuild(1 - build); setDecision(null); }} className={`${control} block text-violet-200 underline underline-offset-4`}>{build === 0 ? "Review the fix →" : "Revisit the regression →"}</button>
          </div>}
        </div>
        <div className="border-t border-slate-700 pt-4 lg:col-span-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          <h2 className="font-pixel text-2xl">The release rule</h2>
          <p className="mt-2 max-w-md leading-relaxed text-slate-300">The tally must agree with the reference for every pair of batches. Pud asks Lean to check the TypeScript claim. Its replay caught the dropped batch on this input.</p>
          <ProofLink href={`${example}/availability/README.md`}>Read the regression</ProofLink>
        </div>
      </section>
    </main>
  );
}
