"use client";

import { useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { CountyRoute } from "./map";

const examples = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/";
const stops = [
  {
    name: "Source mill",
    place: "Source",
    path: "linear-search.ts",
    line: 5,
    caption: "The search stops at the first match.",
    code: "if (value === target) return index;",
    x: 16,
  },
  {
    name: "Claim office",
    place: "Claim",
    path: "linear-search.proof.ts",
    line: 12,
    caption: "The rule covers every list and target.",
    code: 'lean.ref("LinearSearch.firstMatch", values, target)',
    x: 41.6,
  },
  {
    name: "Observatory",
    place: "Proof",
    path: "linear-search-lemmas.lean",
    line: 35,
    caption: "Lean certifies the index of the first match, or −1.",
    code: "theorem correct (values : List Int) (target : Int) : firstMatch values target (scan values target 0) := scan_correct values target 0",
    x: 82.5,
  },
];
export function PudCounty() {
  const [stop, setStop] = useState(0);
  const current = stops[stop];
  return (
    <main className="min-h-svh bg-emerald-950 text-amber-50 selection:bg-yellow-300 selection:text-emerald-950">
      <header className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-2 sm:px-8 lg:px-12">
        <a
          href="/"
          className="inline-flex min-h-11 items-center font-serif text-3xl font-black italic tracking-tighter"
        >
          Pud.
        </a>
        <a
          href={alphaEntryPath}
          className="inline-flex min-h-11 items-center border-b-2 border-amber-300 px-1 text-sm font-bold"
        >
          Join the alpha ↗
        </a>
      </header>
      <div className="mx-auto max-w-screen-2xl px-2 pb-8 sm:px-6 lg:px-10">
        <section
          aria-labelledby="county-title"
          className="overflow-hidden border-4 border-amber-100 bg-amber-100 text-emerald-950 md:border-8"
        >
          <div className="relative isolate aspect-5/4 overflow-hidden bg-cyan-300 sm:aspect-2/1 lg:aspect-5/2">
            <div
              className={`absolute left-0 top-0 aspect-2/1 w-[165%] origin-left motion-safe:transition-transform motion-safe:duration-700 sm:w-full sm:translate-x-0 lg:top-auto lg:bottom-0 ${["translate-x-0", "-translate-x-[15%]", "-translate-x-[39.4%]"][stop]}`}
            >
              <img
                src="/editions/worlds/proof-country.webp"
                alt="A pixel-art route from two little workshops across a stone bridge to Pud’s observatory."
                width="1774"
                height="887"
                fetchPriority="high"
                className="absolute inset-0 size-full"
              />
              <CountyRoute stop={stop} />

              <fieldset aria-label="Map stops" className="contents">
                {stops.map((s, i) => (
                  <button
                    type="button"
                    key={s.name}
                    style={{ left: s.x + "%", top: i === 2 ? "69%" : "74%" }}
                    onFocus={() => {
                      if (matchMedia("(max-width: 639px)").matches) setStop(i);
                    }}
                    aria-pressed={stop === i}
                    onClick={() => setStop(i)}
                    className="absolute z-10 flex min-h-11 -translate-x-1/2 cursor-pointer items-start justify-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-950"
                  >
                    <span
                      className="flex items-center border-2 border-emerald-950 bg-amber-50 px-1.5 py-0.5 font-pixel text-xs font-bold text-emerald-950 shadow-[2px_3px_var(--color-emerald-950)] sm:px-2 sm:text-lg"
                      style={{
                        background: stop === i ? "var(--color-yellow-300)" : undefined,
                      }}
                    >
                      {s.name}
                    </span>
                  </button>
                ))}
              </fieldset>
            </div>
            <h1 aria-label="Pud County"
              id="county-title"
              className="pointer-events-none absolute top-1/20 left-1/25 font-pixel text-5xl leading-[.79] font-bold tracking-tighter text-emerald-950 sm:text-8xl lg:text-9xl xl:text-[10rem]"
              style={{
                textShadow: "3px 3px var(--color-yellow-200), 5px 5px var(--color-emerald-900)",
              }}
            >
              Pud
              <br />
              County.
            </h1>
          </div>
          <div className="grid gap-3 px-3 py-4 sm:grid-cols-2 sm:px-5 md:px-8 md:py-5">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest">
                Linear search / {current.place}
              </p>
              <p
                className="mt-1 max-w-xl text-xl leading-tight font-black tracking-tight md:text-3xl"
                aria-live="polite"
              >
                {current.caption}
              </p>
            </div>
            <div className="min-w-0 border-l-2 border-emerald-950 pl-3 sm:pl-5">
              <code className="block break-words font-mono text-xs font-bold sm:text-sm lg:text-base">
                {current.code}
              </code>
              <a
                href={examples + current.path + "#L" + current.line}
                className="inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4 sm:text-sm"
              >
                Open {current.path} ↗
              </a>
            </div>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-x-5 px-2 pt-2 sm:px-0">
          <p className="text-sm font-medium md:text-base">Pud checks TypeScript claims with Lean.</p>
          <button
            type="button"
            onClick={() => setStop((stop + 1) % stops.length)}
            className="min-h-11 cursor-pointer font-pixel text-lg font-bold text-yellow-200 underline underline-offset-4"
          >
            <span className="mr-2 font-mono text-xs text-amber-50">
              Stop {stop + 1} of {stops.length}
            </span>
            Next stop →
          </button>
        </div>
      </div>
    </main>
  );
}
