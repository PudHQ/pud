"use client";

import { useState } from "react";
import { divideOrZero } from "../../../../../packages/pud/.examples/safe-quotient";
import { divide } from "../../../../../packages/pud/.examples/bigint-division";
import { BenchNav, control, fixtureRoot } from "./bench-ui";

export function CrashTest() {
  const [caught, setCaught] = useState(false);
  let outcome: string;
  try {
    const quotient = caught ? divideOrZero(9n, 0n) : divide(9n, 0n);
    outcome = `return ${quotient}n`;
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    outcome = "throw RangeError";
  }
  return <main className="bg-amber-300 text-ink">
    <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
      <BenchNav name="Crash Test" source={fixtureRoot + "safe-quotient.proof.ts"} />
      <section className="grid gap-4 py-5 md:grid-cols-12 lg:py-8">
        <header className="flex min-w-0 flex-col justify-between md:col-span-5">
          <p className="font-mono text-xs font-bold tracking-widest uppercase">BigInt / exception handling</p>
          <h1 className="my-4 text-7xl leading-none font-black tracking-tighter sm:text-8xl xl:text-9xl">Hit<br className="hidden md:block" /> zero.</h1>
          <p className="max-w-sm text-lg leading-tight font-medium sm:text-xl">A zero divisor throws in JavaScript. Pud can prove what your TypeScript does next.</p>
        </header>
        <img src="/editions/remix/bench/crash.webp" alt="A miniature Pud crash-test car meets a rubber zero on the test track." width="1536" height="1024" fetchPriority="high" className="aspect-3/2 w-full border-2 border-ink object-cover md:col-span-7" />
      </section>
      <section className="grid items-center gap-4 border-y-4 border-ink bg-ink p-4 text-amber-50 sm:p-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="font-mono text-sm font-bold text-amber-300">Impact report</h2>
          <code className="mt-2 block text-xl font-semibold sm:text-3xl">{caught ? "divideOrZero(9n, 0n)" : "divide(9n, 0n)"}</code>
        </div>
        <output className="border-l-4 border-amber-300 pl-4 font-mono text-2xl font-bold md:col-span-4">{outcome}</output>
        <button type="button" aria-pressed={caught} onClick={() => setCaught(!caught)} className={`${control} bg-amber-300 px-4 py-3 text-sm font-black text-ink hover:bg-white md:col-span-3`}>{caught ? "Remove the catch" : "Fit the catch"} ↔</button>
      </section>
    </div>
  </main>;
}
