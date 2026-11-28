"use client";

import { useState } from "react";
import { toCents } from "../../../../../packages/pud/.examples/cents";
import { BenchNav, control, fixtureRoot } from "./bench-ui";

export function SignShop() {
  const [negative, setNegative] = useState(true);
  const amount = negative ? -0.001 : 0.001;
  const cents = toCents(amount);
  const signed = Object.is(cents, -0);
  return <main className="bg-zinc-950 text-teal-50">
    <div className="mx-auto max-w-7xl px-4 sm:px-9">
      <BenchNav name="Sign Shop" source={fixtureRoot+"cents.proof.ts"} />
      <div className="grid gap-5 py-6 md:grid-cols-12 md:gap-7 md:py-10">
        <div className="relative min-w-0 md:col-span-7">
          <img src="/editions/remix/bench/sign.webp" width="1536" height="1024" alt="Two hand-bent neon signs in a workshop window, plus zero and minus zero." className="aspect-3/2 w-full object-cover" fetchPriority="high" />
        </div>
        <section className="flex flex-col justify-center md:col-span-5">
          <p className="font-mono text-xs tracking-widest text-teal-300 uppercase">TypeScript / binary64</p>
          <h1 className="mt-3 text-5xl leading-none font-black tracking-tighter sm:text-7xl">Zero has<br />a sign.</h1>
          <p className="mt-4 max-w-sm leading-snug text-teal-50/85">Round a tenth of a cent. Both amounts print as 0. JavaScript remembers which side they came from.</p>
          <fieldset className="mt-5 flex flex-wrap gap-2"><legend className="sr-only">Amount to round</legend>
            {[true,false].map(minus => <button key={String(minus)} type="button" aria-pressed={negative===minus} onClick={()=>setNegative(minus)} className={`${control} rounded-full border border-teal-300/60 px-5 font-mono text-lg aria-pressed:bg-teal-200 aria-pressed:text-zinc-950`}>{minus ? "−0.1¢" : "+0.1¢"}</button>)}
          </fieldset>
        </section>
      </div>
      <section className="grid gap-4 border-y border-teal-200/45 py-4 font-mono sm:grid-cols-2 md:grid-cols-3">
        <div><h2 className="text-xs uppercase text-teal-300">Expression</h2><p className="mt-2 text-lg">toCents({String(amount)})</p></div>
        <div><h2 className="text-xs uppercase text-teal-300">Signed result</h2><output className="mt-1 block text-4xl font-bold text-rose-300">{signed ? "−0" : "+0"}</output></div>
        <div><h2 className="text-xs uppercase text-teal-300">Object.is(result, −0)</h2><output className="mt-1 block text-3xl">{String(signed)}</output></div>
      </section>
      <p className="pt-4 text-sm text-zinc-300">Pud’s cents sidecar specifies the exact rounded result, including signed zero.</p>
    </div>
  </main>;
}
