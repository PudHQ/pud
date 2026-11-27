"use client";

import { useRef, useState } from "react";
import { alphaEntryPath, pudDexUrl } from "@/lib/links";

const repo = "https://github.com/PudHQ/pud";
const exampleSource = `${repo}/blob/main/packages/pud/.examples`;
const inlineLink = "inline-flex min-h-11 items-center underline-offset-4 hover:underline";
const monoLabel = "font-mono text-xs font-bold uppercase tracking-widest";

function FactoryMark() {
  return (
    <span aria-hidden="true" className="flex h-10 w-11 items-end gap-0.5 border-b-8 border-current py-1">
      <span className="h-1/2 w-3 bg-current" />
      <span className="h-3/4 w-3 bg-current" />
      <span className="h-full w-3 bg-current" />
    </span>
  );
}

export function Factory() {
  return (
    <main className="min-h-screen bg-paper px-4 pt-2 pb-12 text-ink sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-x-4 border-b-4 border-ink py-3">
          <a href="/" className="inline-flex min-h-11 items-center gap-3" aria-label="Pud home">
            <FactoryMark /><span className="text-2xl leading-none font-black tracking-tighter sm:text-3xl">PUD WORKS</span>
          </a>
          <nav className="flex gap-3 font-mono text-xs font-bold uppercase sm:gap-7" aria-label="Pud Works">
            <a className={inlineLink} href={pudDexUrl}>Handbook ↗</a><a className={inlineLink} href={repo}>GitHub ↗</a>
          </nav>
        </header>
        <section aria-labelledby="factory-headline" className="isolate mt-4 border-2 border-ink">
          <div className="grid lg:grid-cols-12">
            <div className="relative flex flex-col justify-between bg-amber-400 px-5 py-6 sm:px-9 sm:py-8 lg:col-span-5">
              <p className={monoLabel}>TypeScript proof toolchain</p>
              <h1 id="factory-headline" className="mt-9 mb-6 text-7xl leading-none font-black tracking-tighter sm:text-8xl lg:my-12 xl:text-9xl">
                Built to<br />spec.
              </h1>
              <div>
                <p className="max-w-80 text-lg leading-snug font-medium sm:text-xl">Give your TypeScript a rule. Pud sends it to Lean and brings back the verdict.</p>
                <a href={alphaEntryPath} className="mt-5 inline-flex min-h-12 items-center gap-6 bg-ink px-5 text-base font-bold text-paper hover:bg-black">
                  Join the alpha <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
            <figure className="relative h-72 overflow-hidden border-t-2 border-ink sm:h-96 lg:col-span-7 lg:h-full lg:min-h-124 lg:border-t-0 lg:border-l-2">
              <img src="/pud-factory.webp" fetchPriority="high" width="1536" height="1024" alt="Copper kettles and pudding conveyors on the factory floor" className="absolute inset-0 h-full w-full object-cover" />
              <img src="/pud-shift-record.webp" alt="" width="512" height="712" className="absolute right-4 bottom-6 w-19 rotate-5 border border-stone-500 shadow-xl sm:right-8 sm:w-24 lg:w-28" />
              <figcaption className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <a href="/#puddex" className="inline-flex min-h-11 items-center gap-2 border border-paper/55 bg-ink/90 px-3 font-mono text-sm text-paper hover:bg-ink hover:underline"><span aria-hidden="true" className="size-2 rounded-full bg-amber-400" /> Factory terminal ↗</a>
              </figcaption>
            </figure>
          </div>
          <div aria-hidden="true" className="flex h-3 overflow-hidden border-t-2 border-ink bg-amber-400">
            {Array.from({ length: 48 }, (_, index) => <i key={`stripe-${index}`} className="-ml-1 mr-4 w-4 shrink-0 -skew-x-35 bg-ink" />)}
          </div>
        </section>
        <section aria-labelledby="factory-example" className="mt-7 grid gap-x-9 gap-y-5 border-y-2 border-ink py-6 sm:mt-9 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className={monoLabel}>Inspection sheet / Clamp</p>
            <h2 id="factory-example" className="mt-2 text-3xl leading-none font-black tracking-tight sm:text-4xl">Keep it in bounds.</h2>
          </div>
          <div className="min-w-0 border-l-4 border-amber-400 pl-5 md:col-span-8">
            <code className="break-words font-mono text-base font-bold sm:text-xl">expect(result).to(pud.bigint().gte(lower).lte(upper))</code>
            <p className="mt-2 max-w-2xl text-base">For any bigint and any ordered pair of bounds, the clamp must return a value inside the interval.</p>
            <a href={`${exampleSource}/clamp.proof.ts`} className={`${inlineLink} mt-1 font-mono text-sm font-bold`}>Read the proof suite ↗</a>
          </div>
        </section>
      </div>
    </main>
  );
}

export function Theatre() {
  const [revealed, setRevealed] = useState(false);
  return (
    <main className="min-h-screen bg-stone-950 px-3 pt-1 pb-12 text-amber-100 sm:px-7 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-x-4 border-b border-amber-200/50 py-2">
          <a href="/" className={`${inlineLink} gap-2 font-serif text-2xl font-bold italic`}><span aria-hidden="true" className="text-amber-400">✦</span> Pud Theatre</a>
          <nav aria-label="Pud Theatre" className="flex items-center gap-4 text-sm sm:gap-7">
            <a href={pudDexUrl} className={inlineLink}>PudDex ↗</a><a href={alphaEntryPath} className={`${inlineLink} font-bold`}>Join the alpha →</a>
          </nav>
        </header>
        <section aria-labelledby="theatre-headline" className="relative isolate mt-3 flex min-h-108 flex-col items-center justify-center overflow-hidden bg-stone-950 pt-8 pb-7 sm:mt-5 sm:min-h-132 lg:aspect-2/1 lg:min-h-0">
          <img src="/editions/worlds/paper-theatre.webp" fetchPriority="high" width="1774" height="887" alt="" className="absolute inset-0 -z-10 h-full w-full object-fill" />
          <img src="/pud-followspot-operator.webp" width="384" height="350" alt="" className="pointer-events-none absolute bottom-1/9 left-1/15 hidden w-1/8 drop-shadow-lg md:block" />
          <div className="mx-auto flex w-4/5 max-w-3xl flex-col items-center text-center">
            <p className="mb-3 font-mono text-xs font-bold tracking-widest text-amber-300 uppercase">{revealed ? "Replay witness" : "A TypeScript proof in one act"}</p>
            <h1 id="theatre-headline" className={revealed ? "sr-only" : "font-serif text-5xl leading-none tracking-tight sm:text-7xl lg:text-8xl xl:text-9xl"}>
              The vanishing<br /><em className="font-normal">batch.</em>
            </h1>
            <div id="theatre-replay" hidden={!revealed}>
              <h2 className="font-serif text-4xl leading-none italic sm:text-6xl lg:text-7xl">One goes missing.</h2>
              <p className="mt-4 font-mono text-sm text-amber-100 sm:text-lg">left = []<br />right = [1n]</p>
              <p className="mx-auto mt-3 max-w-sm text-sm sm:text-base">One available participant. The broken tally returns <strong>zero.</strong></p>
            </div>
            <button type="button" aria-expanded={revealed} aria-controls="theatre-replay" onClick={() => setRevealed(!revealed)} className="mt-4 min-h-11 cursor-pointer border-y border-amber-300 px-3 font-serif text-lg font-semibold text-amber-200 hover:bg-amber-200 hover:text-stone-950 sm:mt-5">
              {revealed ? "Hide the evidence ↑" : "Reveal the evidence ↓"}
            </button>
          </div>
        </section>
        <section aria-labelledby="theatre-programme" className="mt-5 grid gap-x-8 gap-y-3 border-y border-amber-200/50 py-6 sm:mt-7 md:grid-cols-12 md:items-start">
          <div className="md:col-span-4">
            <p className={`${monoLabel} text-amber-300`}>Programme notes</p>
            <h2 id="theatre-programme" className="mt-2 font-serif text-3xl italic sm:text-4xl">Where did it go?</h2>
          </div>
          <div className="md:col-span-8">
            <p className="max-w-2xl text-base leading-relaxed sm:text-lg">A scheduler counts two batches of participants. Its refactor drops the second batch. Pud replays the broken function against the reference and shows the input where they disagree.</p>
            <a href={`${repo}/tree/main/packages/pud/.examples/availability`} className={`${inlineLink} mt-1 font-bold text-amber-200`}>Read the full case ↗</a>
          </div>
        </section>
      </div>
    </main>
  );
}

const diskFiles = [
  {
    name: "roundtrip", file: "zigzag-roundtrip.proof.ts", title: "Back where you started.",
    rule: "Decode an encoded bigint and you should get exactly what you put in.",
    code: "expect(decode(encode(value)))\n  .to(pud.bigint().eq(value))",
    sample: "−3n → encode → 5n → decode → −3n",
  },
  {
    name: "clamp", file: "clamp.proof.ts", title: "Stay inside the interval.",
    rule: "A clamped bigint stays between its lower and upper bounds whenever those bounds are ordered.",
    code: "given(lower <= upper)\nexpect(result)\n  .to(pud.bigint().gte(lower).lte(upper))",
    sample: "clamp(12n, 0n, 8n) → 8n",
  },
  {
    name: "cents", file: "cents.proof.ts", title: "Settle the half cent.",
    rule: "Round the scaled amount to the nearest cent. At a tie, choose the higher integer.",
    code: 'expect(toCents(amount)).toExactly(\n  pud.number().nearestIntegerTo(\n    amount * 100, { ties: "up" }\n  )\n)',
    sample: "toCents(0.125) → 13",
  },
] as const;

const desktopButton = "inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-ink px-4 font-pixel text-lg font-bold hover:underline focus-visible:outline-offset-2";
const windowFrame = "border-2 border-ink bg-stone-100 shadow-md shadow-ink/50";

function DiskIcon() {
  return (
    <span aria-hidden="true" className="inline-flex h-8 w-8 flex-col justify-between rounded-tr-lg border-2 border-ink bg-indigo-700 px-1">
      <span className="self-end border-x-2 border-b-2 border-ink bg-stone-300 px-1.5 pb-1.5" />
      <span className="h-3 border-x-2 border-t-2 border-ink bg-amber-100" />
    </span>
  );
}

export function Desktop() {
  const [fileIndex, setFileIndex] = useState(0);
  const viewer = useRef<HTMLDialogElement>(null);
  const file = diskFiles[fileIndex];
  function browse(index: number) {
    setFileIndex(index);
    viewer.current?.showModal();
  }
  return (
    <main className="min-h-screen bg-stone-200 text-ink">
      <header className="flex flex-wrap items-center justify-between gap-x-3 border-b-2 border-ink bg-stone-100 px-4 font-pixel text-base sm:px-8 sm:text-lg">
        <a href="/" className="inline-flex min-h-12 items-center gap-2 font-bold sm:text-xl">
          <img src="/puddex-loader.png" alt="" width="32" height="32" className="pixelated size-7" /> Pud Desktop
        </a>
        <nav aria-label="Desktop menu" className="flex items-center gap-3 sm:gap-6">
          <a className={inlineLink} href={pudDexUrl}>Handbook</a><a className={inlineLink} href={repo}>GitHub ↗</a>
        </nav>
      </header>
      <section aria-labelledby="desktop-headline" className="relative isolate overflow-hidden bg-sky-300">
        <img src="/editions/worlds/proof-country.webp" alt="Pixel-art countryside with a pudding observatory on a pond" fetchPriority="high" width="1774" height="887" className="absolute inset-0 -z-10 h-full w-full object-cover object-right sm:object-center" />
        <div className="mx-auto flex max-w-7xl items-center px-4 pt-8 pb-32 sm:min-h-128 sm:px-10 sm:py-14 lg:min-h-148 lg:px-14 xl:min-h-160">
          <div className={`${windowFrame} w-full max-w-113`}>
            <div className="flex items-center gap-2 border-b-2 border-ink bg-indigo-800 px-3 py-1 font-pixel text-base text-white">
              <img src="/puddex-loader.png" alt="" width="22" height="22" className="pixelated size-5" /> Welcome.txt
            </div>
            <div className="p-5 sm:p-8">
              <h1 id="desktop-headline" className="font-pixel text-5xl leading-none font-bold tracking-tight sm:text-6xl lg:text-7xl">Write a<br />little proof.</h1>
              <p className="mt-4 max-w-sm text-base leading-snug sm:text-lg">Give a TypeScript function a rule. Pud checks it with Lean for every input your rule covers.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" className={`${desktopButton} bg-amber-300`} onClick={() => browse(0)}>Open examples</button>
                <a className={`${desktopButton} bg-white`} href={alphaEntryPath}>Join the alpha ↗</a>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute right-4 bottom-4 border-2 border-ink bg-stone-100 px-2 font-pixel text-sm sm:right-8">Proof Country.bmp</div>
      </section>
      <section aria-labelledby="disk-title" className="border-y-2 border-ink bg-stone-100 px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <h2 id="disk-title" className="font-pixel text-2xl font-bold">On the example disk</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:gap-x-6">
            {diskFiles.map((item, index) => (
              <button type="button" onClick={() => browse(index)} key={item.name} className="group inline-flex min-h-11 cursor-pointer items-center gap-2 px-1 font-pixel text-lg hover:underline">
                <DiskIcon /> {item.name}
              </button>
            ))}
          </div>
        </div>
      </section>
      <dialog ref={viewer} aria-labelledby="file-viewer-title" className={`${windowFrame} fixed inset-0 m-auto max-h-9/10 w-11/12 max-w-2xl overflow-y-auto p-0 text-ink backdrop:bg-ink/55`}>
        <div className="flex min-h-12 items-center justify-between gap-2 border-b-2 border-ink bg-indigo-800 pl-4 font-pixel text-lg text-white">
          <h2 id="file-viewer-title">Example disk</h2>
          <button type="button" aria-label="Close example disk" onClick={() => viewer.current?.close()} className="min-h-11 min-w-11 cursor-pointer border-l-2 border-ink bg-stone-100 text-2xl font-bold text-ink hover:bg-amber-200">×</button>
        </div>
        <fieldset className="flex flex-wrap gap-1 border-b-2 border-ink p-2">
          <legend className="sr-only">Proof files</legend>
          {diskFiles.map((item, index) => <button type="button" aria-pressed={fileIndex === index} key={item.name} onClick={() => setFileIndex(index)} className="min-h-11 cursor-pointer border-2 border-transparent px-3 font-pixel text-lg hover:underline aria-pressed:border-ink aria-pressed:bg-amber-300">{item.name}</button>)}
        </fieldset>
        <article className="p-4 sm:p-7" aria-live="polite">
          <p className="break-all font-mono text-xs">{file.file}</p>
          <h3 className="mt-2 font-pixel text-3xl font-bold sm:text-4xl">{file.title}</h3>
          <p className="mt-2">{file.rule}</p>
          <pre className="mt-4 border-2 border-ink bg-white p-3 font-mono text-sm wrap-anywhere whitespace-pre-wrap"><code>{file.code}</code></pre>
          <p className="mt-4 font-mono text-sm">{file.sample}</p>
          <a href={`${exampleSource}/${file.file}`} className={`${inlineLink} mt-2 font-bold underline`}>Open proof source ↗</a>
        </article>
      </dialog>
    </main>
  );
}
