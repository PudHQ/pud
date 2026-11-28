"use client";

import { useState } from "react";
import { alphaEntryPath } from "@/lib/links";

import { linearSearch, secondsToMilliseconds } from "./fixtures";
import { fixtureRoot as examples } from "../bench-ui";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-3";
const frames = ["Upright", "Left lean", "Right lean", "Settled"];
const frameRate = 25;

export function FrameAdvance() {
  const [frame, setFrame] = useState(1);
  const seconds = frame / frameRate;
  return (
    <main className="min-h-screen bg-stone-950 text-orange-50">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <nav aria-label="Frame Advance" className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-600 py-2">
          <a className={`inline-flex min-h-11 items-center gap-3 font-serif text-xl italic ${focus}`} href="/"><span className="rounded-sm bg-orange-200 px-1.5 font-mono text-sm font-black text-stone-950 not-italic">P.</span> Pud Pictures</a>
          <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center font-mono text-xs underline underline-offset-4 ${focus}`}>Join the alpha ↗</a>
        </nav>
        <header className="flex flex-wrap items-end justify-between gap-x-7 gap-y-3 pt-8 pb-6 sm:pt-12">
          <h1 className="font-serif text-6xl leading-none tracking-tighter sm:text-8xl lg:text-9xl">Proof in <em className="text-orange-200">motion.</em></h1>
          <p className="max-w-xs text-base leading-snug text-orange-50/85">Four frames of a wobble. Advance the film to see the seconds-to-milliseconds rule Pud proves for Motion.</p>
        </header>
        <section aria-label="Frame advance editor" className="border-y border-stone-600 py-3 sm:py-5">
          <p className="mb-3 flex justify-between gap-2 font-mono text-xs uppercase tracking-wider text-amber-300"><span>Wobble study</span><span>25 fps</span></p>
          <fieldset>
            <legend className="sr-only">Select a film frame</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {frames.map((pose, index) => <button type="button" aria-pressed={frame === index} key={pose} aria-label={`Frame ${index}, ${pose}`} onClick={() => setFrame(index)}
                className={`relative min-w-0 cursor-pointer border-2 border-transparent p-1 text-left font-mono text-xs hover:border-stone-500 aria-pressed:border-orange-200 ${focus}`}>
                <img src={`/editions/remix/machines/frame-${index}.webp`} width={520} height={520} alt="" className="aspect-square w-full" />
                <span className="mt-1.5 flex items-center justify-between gap-2 text-orange-100"><b>{String(index).padStart(2, "0")}</b><span>{pose}</span></span>
              </button>)}
            </div>
          </fieldset>
          <div className="mt-5 grid items-end gap-4 border-t border-stone-600 pt-4 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-2">
              <button className={`min-h-11 cursor-pointer border border-stone-500 px-3 font-mono text-xs enabled:hover:bg-stone-800 disabled:opacity-45 ${focus}`} type="button" disabled={frame === 0} onClick={() => setFrame(frame - 1)}>← Previous</button>
              <button className={`min-h-11 cursor-pointer bg-orange-200 px-3 font-mono text-xs font-bold text-stone-950 enabled:hover:bg-orange-100 disabled:opacity-45 ${focus}`} type="button" disabled={frame === frames.length - 1} onClick={() => setFrame(frame + 1)}>Next frame →</button>
            </div>
            <output className="font-mono text-xl text-orange-200 sm:text-right sm:text-3xl" aria-live="polite">{seconds.toFixed(2)} s = <b>{secondsToMilliseconds(seconds)} ms</b></output>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 py-3 font-mono text-xs text-stone-300">
          <a href="/editions/remix/machines/motion-license.txt" className={`inline-flex min-h-11 items-center underline underline-offset-4 ${focus}`}>Motion · MIT license</a>
          <a href={examples + "motion/seconds.proof.ts"} className={`inline-flex min-h-11 items-center underline underline-offset-4 ${focus}`}>Inspect the unit rule ↗</a>
        </footer>
      </div>
    </main>
  );
}

const values = [4, 8, 7, 7, 3].map(BigInt);
const targets = [7, 4, 9];
const lines = [
  "let index = 0n;",
  "for (const value of values) {",
  "  if (value === target) return index;",
  "  index += 1n;",
  "}",
  "return -1n;",
];

export function Breakpoint() {
  const [target, setTarget] = useState(7);
  const [cursor, setCursor] = useState(-1);
  const match = Number(linearSearch(values, BigInt(target)));
  const terminal = match === -1 ? values.length : match;
  const finished = cursor === terminal;
  const line = cursor < 0 ? 0 : cursor === values.length ? 5 : finished ? 2 : 3;
  const result = cursor < 0 ? "Ready to step" : cursor === values.length ? "Returned −1n · no match" : finished ? `Returned ${cursor}n · first match` : `Index ${cursor} · ${values[cursor]}n ≠ ${target}n`;
  function selectTarget(value: number) {
    setTarget(value);
    setCursor(-1);
  }
  return (
    <main className="min-h-screen bg-blue-700 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <nav aria-label="Breakpoint" className="flex items-center justify-between gap-2 border-b border-white/50 py-2 font-mono text-xs">
          <a href="/" className={`inline-flex min-h-11 items-center gap-2 font-bold ${focus}`}><span aria-hidden="true" className="size-3 rounded-full bg-pink-300" /> Pud / Debugger</a>
          <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center underline underline-offset-4 ${focus}`}>Join the alpha ↗</a>
        </nav>
        <header className="grid items-end gap-4 py-7 sm:py-10 lg:grid-cols-12 lg:gap-6">
          <h1 className="text-6xl leading-none font-semibold tracking-tighter sm:text-7xl lg:col-span-8 xl:text-8xl">Stop at the<br /><span className="text-pink-200">first match.</span></h1>
          <p className="max-w-sm text-lg leading-snug lg:col-span-4">Trace a TypeScript loop one cell at a time. Pud proves it returns the first matching index, or −1n if the target is missing.</p>
        </header>
        <section aria-label="Linear search debugger" className="grid overflow-hidden rounded-lg border border-blue-950 bg-stone-100 text-ink shadow-xl lg:grid-cols-12">
          <div className="border-b border-stone-400 p-4 sm:p-6 lg:col-span-6 lg:border-r lg:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold">linear-search.ts</span>
              <label className="flex items-center gap-2 font-mono text-xs">Target
                <select value={target} onChange={event => selectTarget(Number(event.target.value))} className={`min-h-11 cursor-pointer border border-stone-400 bg-white px-2 font-bold ${focus}`}>
                  {targets.map(value => <option key={value} value={value}>{value}n</option>)}
                </select>
              </label>
            </div>
            <ol className="mt-3 border-y border-stone-400 py-3">
              {lines.map((content, index) => <li key={content} aria-current={line === index ? "step" : undefined} className="flex items-baseline gap-2 py-0.5 font-mono text-xs aria-[current=step]:bg-blue-200 sm:text-sm">
                <span className="w-4 shrink-0 text-center text-red-700" aria-hidden="true">{line === index ? "●" : ""}</span>
                <code className="wrap-anywhere whitespace-pre-wrap">{content}</code>
              </li>)}
            </ol>
            <a href={examples + "linear-search.proof.ts"} className={`mt-2 inline-flex min-h-11 items-center font-mono text-xs font-semibold underline underline-offset-4 ${focus}`}>Read the search proof ↗</a>
          </div>
          <div className="flex flex-col justify-between gap-5 p-4 sm:p-6 lg:col-span-6">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-widest">values[]</p>
              <div className="grid grid-cols-5 gap-1.5 font-mono">
                {values.map((value, index) => <div key={`${value}-${index}`} className={`min-w-0 border-t-4 p-1 text-center ${index === cursor ? "border-pink-500 bg-blue-700 text-white" : "border-stone-400 bg-white"}`}>
                  <span className="block text-xs">[{index}]</span><b className="text-2xl sm:text-3xl">{String(value)}</b>
                </div>)}
              </div>
            </div>
            <output aria-live="polite" className="block font-mono text-base font-bold">{result}</output>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setCursor(finished ? -1 : cursor + 1)} className={`min-h-11 cursor-pointer bg-blue-700 px-4 font-mono text-sm font-bold text-white hover:bg-blue-800 ${focus}`}>{finished ? "Restart ↺" : "Step →"}</button>
              <button type="button" disabled={finished} onClick={() => setCursor(terminal)} className={`min-h-11 cursor-pointer border border-stone-500 px-3 font-mono text-xs enabled:hover:bg-white disabled:opacity-40 ${focus}`}>Run to return</button>
            </div>
          </div>
        </section>
      </div>
      <div className="h-10" />
    </main>
  );
}
