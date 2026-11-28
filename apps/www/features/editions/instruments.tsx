"use client";

import { useState } from "react";
import { alphaEntryPath, pudDexUrl } from "@/lib/links";

const repo = "https://github.com/PudHQ/pud";
const examples = `${repo}/tree/main/packages/pud/.examples`;
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4";

/** Orthographic construction drawing of the two batches entering the tally. */
function BatchDiagram({ dropped }: { dropped: boolean }) {
  return (
    <svg viewBox="0 0 370 125" className="w-full max-w-80" aria-hidden="true">
      <defs>
        <pattern id="wb-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" className="fill-stone-400" />
        </pattern>
        <g id="wb-batch" strokeWidth="1.3" strokeLinejoin="round" className="stroke-ink">
          <path d="m0 27 44-23 44 23-44 23z" className="fill-lime-300" />
          <path d="m0 27 44 23v24L0 51z" className="fill-lime-500" />
          <path d="m44 50 44-23v24L44 74z" className="fill-lime-200" />
          <path d="m9 26 34 17m-25-22 34 17m-24-22 34 17m-24-22 34 17M7 38l30 16m-30-9 30 16m15-9 29-15m-29 22 29-15" fill="none" />
        </g>
      </defs>
      <rect width="370" height="125" fill="url(#wb-grid)" />
      <g className="stroke-stone-600" strokeWidth="1.3" fill="none">
        <path d="m78 83 49 25 56-28 48 23 61-31" strokeDasharray="3 3" />
        <path d="m163 45 22-11 63 32 46-23" strokeDasharray="3 3" />
      </g>
      <use href="#wb-batch" x="4" y="29" />
      <use href="#wb-batch" x="98" y="6" opacity={dropped ? 0.2 : 1} />
      <g className="stroke-ink" strokeWidth="1.3" strokeLinejoin="round">
        <path d="m250 59 42-22 43 22-43 22z" className="fill-stone-100" />
        <path d="m250 59 42 22v21l-42-22z" className="fill-stone-300" />
        <path d="m292 81 43-22v21l-43 22z" className="fill-stone-100" />
        <path d="m277 59 29 0m-15-8v16" strokeWidth="3" />
      </g>
    </svg>
  );
}

export function Workbench() {
  const [dropped, setDropped] = useState(false);
  return (
    <main className="bg-stone-100 text-ink">
      <nav aria-label="Workbench" className="border-b border-stone-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:px-8 lg:px-12">
          <a href="/" className={`flex min-h-11 items-center gap-2.5 ${focus}`}>
            <span className="grid size-8 place-items-center bg-lime-300 text-xl font-black" aria-hidden="true">⌁</span>
            <b className="text-2xl leading-none font-black tracking-tighter">Pud</b>
            <span className="hidden border-l border-stone-400 pl-3 font-mono text-xs sm:inline">Workbench</span>
          </a>
          <div className="flex items-center gap-5 font-mono text-xs sm:gap-8">
            <a href={pudDexUrl} className={`inline-flex min-h-11 items-center hover:underline ${focus}`}>Docs</a>
            <a href={repo} className={`inline-flex min-h-11 items-center hover:underline ${focus}`}>GitHub ↗</a>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <div className="grid gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-20">
          <header className="min-w-0 lg:col-span-5">
            <p className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-widest">
              <span className="size-2.5 bg-lime-600" />TypeScript proof tools
            </p>
            <h1 className="text-6xl leading-none font-bold tracking-tighter sm:text-7xl xl:text-8xl">Refactor<br />with proof.</h1>
            <p className="mt-5 max-w-sm text-lg leading-snug text-stone-700">Write the rule once in TypeScript. Change the implementation. Ask Lean if it still holds.</p>
            <a href={alphaEntryPath} className={`mt-6 inline-flex min-h-12 items-center gap-6 bg-ink px-5 text-sm font-semibold text-white hover:bg-stone-700 ${focus}`}>
              Join the alpha <span aria-hidden="true">↗</span>
            </a>
          </header>
          <section aria-label="Availability proof comparison" className="min-w-0 rounded-2xl border border-stone-400 bg-stone-300 p-2 shadow-lg sm:p-3 lg:col-span-7">
            <div className="overflow-hidden rounded-lg border border-stone-500 bg-zinc-900 text-stone-100">
              <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 sm:px-5">
                <p className="flex min-h-12 items-center gap-2 font-mono text-xs"><strong className="rounded-sm bg-sky-300 p-1 text-zinc-900">TS</strong> count-free.ts</p>
                <span className="font-mono text-xs text-zinc-400">Recorded run</span>
              </div>
              <div className="px-3 py-6 font-mono text-xs leading-7 sm:px-5 sm:text-sm">
                <code className="block break-words">
                  <span className="text-violet-300">export function</span>{" "}<span className="text-lime-200">countFree</span>(<br />
                  <span className="pl-4">left: <span className="text-sky-300">readonly bigint[]</span>,</span><br />
                  <span className="pl-4">right: <span className="text-sky-300">readonly bigint[]</span></span><br />
                  {"): "}<span className="text-sky-300">bigint</span>{" {"}<br />
                  <span className={`block border-l-2 px-3 ${dropped ? "border-orange-400 bg-orange-400/10" : "border-lime-300 bg-lime-300/10"}`}>
                    <span className="text-violet-300">return</span>{" "}{!dropped && <>countBatch(right) + </>}countBatch(left);
                  </span>
                  {"}"}
                </code>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-700 bg-zinc-950 px-4 py-3 sm:px-5">
                <div aria-live="polite" className="font-mono">
                  <p className={`text-sm font-bold ${dropped ? "text-orange-300" : "text-lime-300"}`}>{dropped ? "× FAIL" : "✓ PASS"}</p>
                  <p className="mt-1 text-xs text-zinc-300">{dropped ? "Expected 1n · received 0n" : "Both batches counted"}</p>
                  {dropped && <p className="mt-1 text-xs text-zinc-400">left = [] · right = [1n]</p>}
                </div>
                <button type="button" onClick={() => setDropped(!dropped)} className={`min-h-11 cursor-pointer rounded-md bg-stone-100 px-3 text-xs font-semibold text-ink hover:bg-lime-200 ${focus}`}>
                  {dropped ? "Restore batch" : "Drop a batch"} <span aria-hidden="true">⇄</span>
                </button>
              </div>
            </div>
          </section>
        </div>
        <section className="grid items-center gap-5 border-t border-stone-400 py-8 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4"><BatchDiagram dropped={dropped} /></div>
          <div className="md:col-span-5">
            <h2 className="text-2xl font-bold tracking-tight">One rule, two batches.</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-700">The scheduler must count every available participant. Drop the right batch and Pud finds a witness. The left list is empty. The right holds one vote.</p>
          </div>
          <a href={`${examples}/availability`} className={`w-fit py-3 font-mono text-xs font-bold underline underline-offset-4 md:col-span-3 md:justify-self-end ${focus}`}>Inspect the fixture ↗</a>
        </section>
      </div>
    </main>
  );
}

const angle = Math.PI / 180;
const dialCenter = { x: 266, y: 211 };

function globeLine(latitude: number | null, coordinate: number) {
  const points: string[] = [];
  let visible = false;
  for (let step = -180; step <= 180; step += 3) {
    const lat = (latitude ?? step / 2) * angle;
    const lon = (latitude === null ? coordinate : step) * angle;
    const x = Math.cos(lat) * Math.sin(lon);
    const y = Math.sin(lat);
    const z = Math.cos(lat) * Math.cos(lon);
    const elevated = y * Math.cos(24 * angle) + z * Math.sin(24 * angle);
    const depth = z * Math.cos(24 * angle) - y * Math.sin(24 * angle);
    if (depth >= 0) {
      const tilt = 22 * angle;
      const screenX = dialCenter.x + 131 * (x * Math.cos(tilt) - elevated * Math.sin(tilt));
      const screenY = dialCenter.y - 131 * (x * Math.sin(tilt) + elevated * Math.cos(tilt));
      points.push(`${visible ? "L" : "M"}${screenX.toFixed(2)} ${screenY.toFixed(2)}`);
    }
    visible = depth >= 0;
  }
  return points.join(" ");
}

const globePaths = [
  ...Array.from({ length: 17 }, (_, i) => globeLine(-80 + i * 10, 0)),
  ...Array.from({ length: 36 }, (_, i) => globeLine(null, i * 10)),
].filter(Boolean);

function Dial({ seconds }: { seconds: number }) {
  return (
    <svg viewBox="0 0 532 420" aria-hidden="true" className="block w-full">
      <defs>
        <radialGradient id="obs-halo">
          <stop className="text-amber-300" stopColor="currentColor" stopOpacity=".10" />
          <stop offset=".75" className="text-amber-400" stopColor="currentColor" stopOpacity=".03" />
          <stop offset="1" className="text-amber-400" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="obs-sphere" cx=".32" cy=".29" r=".8">
          <stop className="text-slate-700" stopColor="currentColor" />
          <stop offset=".6" className="text-slate-900" stopColor="currentColor" />
          <stop offset="1" className="text-slate-950" stopColor="currentColor" />
        </radialGradient>
      </defs>
      <circle cx="266" cy="211" r="205" fill="url(#obs-halo)" />
      {Array.from({ length: 81 }, (_, i) => {
        const x = (i * 109 + 39) % 526;
        const y = (i * i * 37 + 19) % 405;
        return <circle key={x} cx={x} cy={y} r={i % 4 === 0 ? 1.1 : 0.55} className="fill-amber-100/70" />;
      })}
      <g fill="none" className="stroke-amber-200/30" strokeWidth=".75">
        <path d="M13 211h506M266 8v399" strokeDasharray="1 5" />
        <circle cx="266" cy="211" r="166" />
        <circle cx="266" cy="211" r="161" />
        <ellipse cx="266" cy="211" rx="224" ry="64" transform="rotate(-28 266 211)" />
      </g>
      <circle cx="266" cy="211" r="131" fill="url(#obs-sphere)" className="stroke-amber-200/70" strokeWidth="1" />
      <g fill="none" className="stroke-amber-100/55" strokeWidth=".6">
        {globePaths.map(path => <path key={path} d={path} />)}
      </g>
      <g fill="none" className="stroke-amber-300">
        <ellipse cx="266" cy="211" rx="183" ry="42" transform="rotate(29 266 211)" strokeWidth="1.3" />
        <ellipse cx="266" cy="211" rx="187" ry="45" transform="rotate(29 266 211)" opacity=".5" strokeWidth=".6" />
        <path d="M74 275q-10-16 14-47m349-87q31 10 20 28" strokeWidth=".7" />
      </g>
      <g className="stroke-amber-200/80">
        {Array.from({ length: 120 }, (_, i) =>
          <path key={i * 3} d={`M266 45v${i % 10 === 0 ? -12 : i % 5 === 0 ? -8 : -4}`} transform={`rotate(${i * 3} 266 211)`} strokeWidth={i % 10 === 0 ? 1.4 : .7} />)}
      </g>
      <g className="fill-amber-100/85 font-mono text-xs" textAnchor="middle">
        <text x="266" y="23">0 / 1 s</text><text x="475" y="215">¼</text><text x="266" y="405">½</text><text x="57" y="215">¾</text>
      </g>
      <g transform={`rotate(${seconds * 360} 266 211)`}>
        <path d="m266 53-5-12h10z" className="fill-amber-300" />
        <circle cx="266" cy="51" r="12" className="fill-amber-300/15" />
      </g>
      <path d="M266 205v12m-6-6h12" className="stroke-amber-100" strokeWidth="1.2" />
    </svg>
  );
}

const intervals = [0.125, 0.25, 0.5, 0.75, 1];

export function Observatory() {
  const [seconds, setSeconds] = useState(intervals[0] as number);
  return (
    <main className="bg-slate-950 text-amber-50">
      <div className="mx-auto max-w-7xl px-5 sm:px-10 lg:px-14">
        <nav aria-label="Observatory" className="flex items-center justify-between gap-3 border-b border-amber-200/30 py-3">
          <a href="/" className={`inline-flex min-h-11 items-center gap-3 font-serif text-2xl ${focus}`}>
            <span aria-hidden="true" className="text-3xl text-amber-300">✴</span> Pud <span className="hidden text-amber-100/65 sm:inline">Observatory</span>
          </a>
          <a href={pudDexUrl} className={`inline-flex min-h-11 items-center font-mono text-xs text-amber-100 underline-offset-4 hover:underline ${focus}`}>Handbook ↗</a>
        </nav>
        <div className="grid items-center gap-y-4 pt-8 pb-6 sm:pt-12 sm:pb-10 md:grid-cols-12">
          <header className="min-w-0 md:col-span-6">
            <p className="mb-5 font-mono text-xs uppercase tracking-widest text-amber-300">Proofs for TypeScript</p>
            <h1 className="font-serif text-6xl leading-none tracking-tighter sm:text-7xl lg:text-8xl">How long is<br /><em className="font-normal text-amber-200">a second?</em></h1>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-slate-300 sm:text-lg">Motion turns seconds into milliseconds. Pud proves its unit rule across every JavaScript number.</p>
            <a href={alphaEntryPath} className={`mt-6 inline-flex min-h-12 items-center gap-7 rounded-full border border-amber-200/70 px-6 text-sm font-medium text-amber-100 hover:bg-amber-100 hover:text-slate-950 ${focus}`}>
              Join the alpha <span aria-hidden="true">↗</span>
            </a>
          </header>
          <figure className="min-w-0 md:col-span-6">
            <Dial seconds={seconds} />
            <figcaption className="text-center font-mono text-xs tracking-widest text-amber-100/70">SECONDS OF ONE REVOLUTION</figcaption>
          </figure>
        </div>
        <section aria-labelledby="conversion-title" className="grid items-center gap-5 border-y border-amber-200/30 py-6 md:grid-cols-12 lg:py-8">
          <div className="md:col-span-4">
            <h2 id="conversion-title" className="font-serif text-3xl">Set the interval.</h2>
            <p className="mt-1 text-sm text-slate-300">One second is a thousand milliseconds.</p>
          </div>
          <fieldset className="flex flex-wrap gap-1 md:col-span-5">
            <legend className="sr-only">Interval in seconds</legend>
            {intervals.map(value => <button type="button" key={value} aria-pressed={seconds === value} onClick={() => setSeconds(value)}
              className={`min-h-11 min-w-11 cursor-pointer border border-amber-200/30 px-2 font-mono text-xs text-amber-100 hover:border-amber-300 aria-pressed:bg-amber-200 aria-pressed:text-slate-950 ${focus}`}>{value} s</button>)}
          </fieldset>
          <output aria-live="polite" className="whitespace-nowrap font-mono text-2xl tracking-tight text-amber-200 md:col-span-3 md:text-right">
            {(seconds * 1000).toLocaleString("en-US")} ms
          </output>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-x-5 py-4 text-xs text-slate-300">
          <span>Checked with the Lean adapter</span>
          <a href={`${examples}/motion`} className={`inline-flex min-h-11 items-center underline underline-offset-4 ${focus}`}>Inspect Motion’s six laws ↗</a>
        </div>
      </div>
    </main>
  );
}

const searchValues = [4, 7, 2, 7];
const searchTargets = [7, 9, 4, 2];

function PixelLandscape() {
  return (
    <svg viewBox="0 0 192 76" preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true" className="absolute inset-0 size-full">
      <rect width="192" height="76" className="fill-sky-300" />
      <g className="fill-sky-100">
        <path d="M6 14h5v-4h6V7h14v3h6v5h5v4H6zM115 17h6v-4h5V9h11v4h6v4h9v4h-37zM67 28h5v-4h10v3h10v4H67zM167 6h4V3h9v3h6v3h-19z" />
        <path d="M37 2h7v2h-7zM151 29h6v2h-6zM3 28h4v2H3z" />
      </g>
      <path d="M0 57h5v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v4h4v4h4v4h4v4h4v4h4v4h4v4h8v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v4h4v4h4v4h4v4h4v4h4v4h4v4h4v4h4v4h4v2h5v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v-4h4v4h4v4h4v4h4v4h4v4h4v4h4v4h4v21H0z" className="fill-blue-400" />
      <path d="M0 59h8v-4h8v-4h12v-3h10v5h7v4h7v2h12v-4h6v-4h6v-4h13v-3h12v3h7v4h6v4h8v4h11v-5h6v-4h6v-4h8v-4h12v-3h9v4h6v4h8v4h8v25H0z" className="fill-indigo-400" />
      <path d="M0 66h11v-4h6v-4h20v4h9v3h9v-5h15v4h10v-4h9v-3h12v4h9v3h15v-4h9v-5h18v4h13v3h12v-5h11v-4h9v17H0z" className="fill-emerald-600" />
      <path d="M0 66h192v4H0z" className="fill-lime-300" />
      <path d="M0 70h192v6H0z" className="fill-amber-700" />
      <path d="M0 70h4v2H0zm12 0h6v2h-6zm16 0h5v2h-5zm21 0h8v2h-8zm17 0h8v2h-8zm21 0h5v2h-5zm16 0h6v2h-6zm25 0h8v2h-8zm15 0h7v2h-7zm24 0h8v2h-8zm17 0h5v2h-5z" className="fill-amber-400" />
    </svg>
  );
}

function SearchCartridge() {
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const target = searchTargets[round] as number;
  const first = searchValues.indexOf(target);
  const solved = guess === first;
  let message = `Pick the first ${target}. Use −1 if it’s missing.`;
  if (solved) message = first < 0 ? "Correct! Missing targets return −1." : `Correct! The first ${target} is at index ${first}.`;
  else if (guess !== null) message = guess > first && searchValues[guess] === target ? "That’s a match. There’s an earlier one!" : "Try another answer.";

  const positions = ["left-0", "left-1/4", "left-1/2", "left-3/4"];
  const next = () => {
    setRound((round + 1) % searchTargets.length);
    setGuess(null);
  };

  return (
    <div className="min-w-0 rounded-2xl border-4 border-indigo-950 bg-violet-300 p-2 shadow-xl shadow-indigo-950/50 sm:p-4">
      <div className="overflow-hidden rounded-md border-4 border-indigo-950 bg-indigo-950">
        <div className="flex items-center justify-between gap-2 bg-indigo-950 px-3 py-1.5 font-pixel text-lg text-yellow-200">
          <span>LINEAR SEARCH</span>
          <span className="text-xs text-violet-200">Lv. {round + 1}</span>
        </div>
        <div className="relative h-32 overflow-hidden bg-sky-300 sm:h-40 xl:h-48">
          <PixelLandscape />
          <div className={`absolute bottom-3 flex w-1/4 justify-center sm:bottom-4 ${positions[guess !== null && guess >= 0 ? guess : 0]}`}>
            <img src="/puddex-loader.png" alt="" width="40" height="40" className="pixelated size-14 sm:size-17" />
          </div>
          <div className="absolute top-2 right-2 border-2 border-indigo-950 bg-yellow-200 px-2 font-pixel text-base leading-tight text-indigo-950">FIND {target}</div>
        </div>
        <div className="grid grid-cols-4 gap-1 bg-indigo-950 p-1">
          {searchValues.map((value, index) => (
            <button type="button" key={`${index}-${value}`} aria-label={`Index ${index}, value ${value}`} aria-pressed={guess === index}
              onClick={() => setGuess(index)}
              className={`flex min-h-14 cursor-pointer flex-col items-center justify-center border-b-4 border-amber-600 bg-amber-200 px-1 font-pixel text-indigo-950 hover:bg-yellow-100 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-white aria-pressed:border-violet-500 aria-pressed:bg-violet-200`}>
              <span className="text-3xl leading-none">{value}</span><span className="font-mono text-xs">[{index}]</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <button type="button" aria-pressed={guess === -1} onClick={() => setGuess(-1)} className={`min-h-11 cursor-pointer font-mono text-xs font-bold text-indigo-950 underline underline-offset-4 ${focus}`}>Absent (−1)</button>
        <button type="button" onClick={next} className={`min-h-11 cursor-pointer rounded-full border-2 border-indigo-950 bg-pink-200 px-4 font-pixel text-base text-indigo-950 hover:bg-pink-100 ${focus}`}>Next target ▸</button>
      </div>
      <p className="mt-2 border-t-2 border-indigo-950/40 px-1 pt-2 font-mono text-xs font-medium text-indigo-950" role="status" aria-live="polite">{message}</p>
    </div>
  );
}

export function Cartridge() {
  return (
    <main className="bg-violet-800 text-yellow-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-12">
        <nav aria-label="Cartridge" className="flex items-center justify-between border-b-2 border-violet-400/65 py-2">
          <a href="/" className={`flex min-h-11 items-center gap-2 font-pixel text-3xl leading-none tracking-tight ${focus}`}>
            <img src="/puddex-loader.png" alt="" width="40" height="40" className="pixelated size-8" /> Pud Arcade
          </a>
          <a href={pudDexUrl} className={`inline-flex min-h-11 items-center font-mono text-xs text-yellow-100 underline underline-offset-4 ${focus}`}>Manual ↗</a>
        </nav>
        <div className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-12 lg:gap-10 lg:py-18">
          <header className="min-w-0 lg:col-span-6">
            <p className="mb-4 font-mono text-xs font-bold uppercase tracking-widest text-violet-100">TypeScript proof arcade</p>
            <h1 className="font-pixel text-7xl leading-none font-bold tracking-tighter text-yellow-200 sm:text-8xl xl:text-9xl">First match<br /><span className="text-pink-200">wins.</span></h1>
            <p className="mt-4 max-w-sm text-lg leading-snug text-violet-50">Can you beat linear search? Play through an array, then see how Pud proves the rule for every list in its model.</p>
            <a href={alphaEntryPath} className={`mt-6 inline-flex min-h-12 items-center gap-5 border-2 border-indigo-950 border-b-4 bg-yellow-200 px-5 font-pixel text-xl text-indigo-950 hover:bg-yellow-100 ${focus}`}>
              Join the alpha <span aria-hidden="true">▸</span>
            </a>
          </header>
          <div className="lg:col-span-6"><SearchCartridge /></div>
        </div>
      </div>
      <section className="border-t-4 border-indigo-950 bg-yellow-100 text-indigo-950">
        <div className="mx-auto grid max-w-7xl items-center gap-3 px-4 py-7 sm:px-8 md:grid-cols-12 md:gap-8 lg:px-12">
          <h2 className="font-pixel text-4xl font-bold md:col-span-4">The win condition</h2>
          <p className="max-w-md text-sm leading-relaxed md:col-span-5">Return the first matching index, or −1 when the target is absent. Lean checks the property for dense bigint arrays of any finite length.</p>
          <a href={`${pudDexUrl}/notes/handbook/engineering/verification/lean/checking-typescript-with-lean/#run-the-search-proof`}
            className={`inline-flex min-h-11 w-fit items-center font-mono text-xs font-bold underline underline-offset-4 md:col-span-3 md:justify-self-end ${focus}`}>Read the proof ↗</a>
        </div>
      </section>
    </main>
  );
}
