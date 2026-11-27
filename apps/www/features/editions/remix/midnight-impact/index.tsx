"use client";

import { useEffect, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { SumFigure } from "./sum-figure";
import type { SumStage } from "./sum-drawing";
import { inspectSum, smallestCounterexample, sumSources } from "./sum-model";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2";
const micro = "font-mono text-xs font-bold uppercase tracking-wider";
const stages = [
  { key: "stack", title: "Stack" },
  { key: "pair", title: "Double" },
  { key: "rectangle", title: "Fit pieces" },
] as const;

export function MidnightImpact() {
  const [rows, setRows] = useState(8);
  const [broken, setBroken] = useState(false);
  const [stage, setStage] = useState<SumStage>("stack");
  const [revision, setRevision] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const sample = inspectSum(rows, broken);

  useEffect(() => {
    if (interacted) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("pair");
      return;
    }
    const pair = window.setTimeout(() => setStage("pair"), 520);
    return () => window.clearTimeout(pair);
  }, [interacted]);

  function selectStage(next: SumStage) {
    setInteracted(true);
    if (next === stage && next === "rectangle") setRevision((previous) => previous + 1);
    setStage(next);
  }

  function mutate(next: boolean) {
    setBroken(next);
    setInteracted(true);
    setStage("rectangle");
  }

  function showWitness() {
    setRows(smallestCounterexample.rows);
    mutate(true);
  }

  return (
    <main className="min-h-svh overflow-x-clip bg-amber-50 text-stone-950 selection:bg-indigo-700 selection:text-white">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-7 lg:px-12">
        <nav
          aria-label="Pud"
          className="flex min-h-16 items-center justify-between border-b-4 border-stone-950 sm:min-h-18"
        >
          <a
            href="/"
            aria-label="Pud home"
            className={`flex min-h-11 items-center gap-2 text-3xl leading-none font-black tracking-tighter ${focus}`}
          >
            <img src="/pud.svg" alt="" width="31" height="31" />
            Pud.
          </a>
          <a
            href="/editions/night-shift"
            className={`hidden min-h-11 items-center font-pixel text-2xl leading-none tracking-tight text-indigo-800 underline-offset-4 hover:underline sm:inline-flex ${focus}`}
          >
            Night Shift
          </a>
          <a
            href={alphaEntryPath}
            className={`flex min-h-11 items-center gap-1 border-l border-stone-950 pl-4 font-mono text-xs font-bold uppercase underline-offset-4 hover:underline sm:pl-6 ${focus}`}
          >
            Join the alpha <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <div className="grid lg:grid-cols-12">
          <header className="min-w-0 py-5 sm:py-6 lg:col-span-5 lg:border-r-2 lg:border-stone-950 lg:py-8 lg:pr-7 xl:pr-10">
            <p className={`${micro} mb-3 text-indigo-800`}>
              <span className="sm:hidden">Night shift / </span>No. 01 <span aria-hidden="true">—</span> Triangular
              numbers
            </p>
            <h1 className="font-sans text-5xl leading-none font-black tracking-tight sm:text-7xl lg:text-8xl lg:leading-[.79] xl:text-9xl">
              <span className="lg:block">CRASH</span>{" "}
              <span className="lg:mt-2 lg:block">
                TEST<span className="text-indigo-700">.</span>
              </span>
            </h1>
            <h2 className="mt-3 font-serif text-2xl leading-none font-bold italic sm:mt-5 sm:text-3xl lg:mt-7 xl:text-4xl">
              The missing square.
            </h2>
            <p className="mt-2 max-w-95 text-base leading-snug sm:text-lg">
              Two staircases fill a rectangle. Change one digit in the loop that counts them.
            </p>
            <div className="mt-4 flex max-w-99 items-stretch border-2 border-stone-950 bg-stone-950 sm:mt-5">
              <code className="flex min-w-0 grow items-center gap-1.5 px-2.5 py-3 font-mono text-sm font-bold whitespace-nowrap text-white sm:px-3">
                remaining &gt;{" "}
                <mark className={`px-1.5 py-0.5 text-stone-950 ${broken ? "bg-orange-400" : "bg-indigo-200"}`}>
                  {broken ? "1n" : "0n"}
                </mark>
              </code>
              <button
                type="button"
                onClick={() => mutate(!broken)}
                className={`min-h-12 shrink-0 cursor-pointer border-l-2 border-stone-950 bg-orange-500 px-2.5 text-sm leading-tight font-black text-stone-950 hover:bg-orange-400 active:bg-orange-300 sm:px-4 ${focus}`}
              >
                {broken ? "Restore 1n" : "Skip 1n"}
              </button>
            </div>
          </header>

          <section
            aria-label="Geometric proof"
            className="flex min-w-0 flex-col border-t-2 border-stone-950 lg:col-span-7 lg:border-t-0 lg:pl-7 xl:pl-10"
          >
            <div className="flex min-h-13 items-center justify-between gap-2 border-b border-stone-950">
              <span className={micro}>Construction</span>
              <fieldset className="flex gap-1" aria-label="Construction steps">
                {stages.map((item, i) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={stage === item.key}
                    onClick={() => selectStage(item.key)}
                    className={`min-h-11 cursor-pointer px-1.5 font-mono text-xs font-bold hover:underline aria-pressed:text-indigo-800 aria-pressed:underline aria-pressed:decoration-2 aria-pressed:underline-offset-4 sm:px-2 ${focus}`}
                  >
                    <span aria-hidden="true" className="hidden sm:inline">
                      {i + 1}.{" "}
                    </span>
                    {item.title}
                  </button>
                ))}
              </fieldset>
            </div>
            <div className="relative isolate aspect-4/3 min-h-52 w-full grow sm:aspect-2/1 lg:aspect-auto lg:min-h-75 xl:min-h-88">
              <SumFigure n={rows} broken={broken} stage={stage} revision={revision} onStage={selectStage} />
            </div>
            <div className="flex min-h-13 items-center gap-3 border-t border-stone-950 sm:gap-5">
              <label htmlFor="sum-rows" className="shrink-0 font-mono text-sm font-bold">
                Rows <span className="ml-1 font-serif text-xl italic">n</span>
              </label>
              <input
                id="sum-rows"
                type="range"
                min={1}
                max={12}
                step={1}
                value={rows}
                onChange={(event) => {
                  setInteracted(true);
                  setRows(Number(event.currentTarget.value));
                }}
                className={`h-11 w-full min-w-0 cursor-ew-resize accent-indigo-700 ${focus}`}
              />
              <output
                htmlFor="sum-rows"
                className="w-7 shrink-0 text-right font-mono text-xl font-black tabular-nums"
              >
                {rows}
              </output>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="sum-rule"
          className="grid border-y-4 border-stone-950 bg-stone-950 text-amber-50 sm:grid-cols-2 lg:grid-cols-12"
        >
          <div className="flex flex-col justify-center gap-1 px-4 py-3 sm:px-6 sm:py-4 lg:col-span-5">
            <h2 id="sum-rule" className={`${micro} text-indigo-200`}>
              The claim · S(n) is the loop’s return
            </h2>
            <p className="font-serif text-2xl leading-tight italic sm:text-3xl xl:text-4xl">
              <span aria-hidden="true">2S(n) = n(n + 1)</span>
              <span className="sr-only">Twice the loop result equals n times n plus one.</span>
            </p>
          </div>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:px-6 lg:col-span-7 ${broken ? "bg-orange-500 text-stone-950" : "bg-indigo-700 text-white"}`}
          >
            <div>
              <p className={micro}>
                {stage === "stack"
                  ? "One staircase"
                  : stage === "pair"
                    ? "Two copies"
                    : broken
                      ? "Two squares missing"
                      : "Both copies fit"}
              </p>
              <p className="mt-1 font-mono text-xs">
                {stage === "rectangle"
                  ? `${sample.actual} per copy · ${rows} × ${rows + 1} slots`
                  : stage === "pair"
                    ? "Fit the pieces to check the claim."
                    : "Double the staircase and turn its copy."}
              </p>
            </div>
            <p className="font-mono text-3xl leading-none font-black tracking-tighter tabular-nums sm:text-4xl xl:text-5xl">
              {stage === "stack"
                ? sample.actual
                : stage === "pair"
                  ? `${sample.actual} + ${sample.actual}`
                  : `${sample.doubled} ${broken ? "≠" : "="} ${sample.area}`}
            </p>
          </div>
        </section>

        <section
          aria-label="Night shift proof desk"
          className="grid gap-x-6 border-b-2 border-stone-950 py-4 sm:py-5 lg:grid-cols-12"
        >
          <div className="flex min-w-0 gap-3 sm:gap-4 lg:col-span-7">
            <div className="relative h-22 w-24 shrink-0 self-start overflow-hidden border-2 border-stone-950 bg-indigo-950 sm:h-24 sm:w-32">
              <img
                src="/editions/remix/places/night-shift.webp"
                width="1440"
                height="720"
                alt="Pud on duty at the lamp-lit proof desk."
                className="absolute right-0 bottom-0 h-full w-full scale-230 object-cover object-[84%_64%] origin-[80%_61%]"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-pixel text-2xl leading-none font-bold text-indigo-800">Night shift log</h2>
              <p className="mt-1.5 max-w-lg text-sm leading-snug sm:text-base">
                {broken
                  ? `At n = ${rows}, the edited loop returns ${sample.actual}. Skipping 1 loses a square from each copy.`
                  : "Pud checks this TypeScript loop with Lean. Its proof covers every nonnegative bigint, including zero."}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 lg:col-span-5 lg:mt-0 lg:justify-end">
            <button
              type="button"
              onClick={showWitness}
              className={`min-h-11 cursor-pointer font-mono text-xs font-bold underline underline-offset-4 hover:text-indigo-800 ${focus}`}
            >
              {broken ? "Smallest counterexample" : "Break it at n = 1"} →
            </button>
            <a
              href={sumSources.sidecar}
              className={`inline-flex min-h-11 items-center font-mono text-xs font-bold underline underline-offset-4 hover:text-indigo-800 ${focus}`}
            >
              Read the proof ↗
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
