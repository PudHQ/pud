"use client";

import { useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { assets, focus, proofLink } from "./proofs";

const parts = [
  {
    name: "Inputs",
    file: "cutaway-lid.webp",
    code: "value: pud.bigint(),\nlower: pud.bigint(),\nupper: pud.bigint()",
    explanation: "Choose three arbitrary integers.",
    line: 6,
    closed: 33,
    gap: -21,
    height: 25,
  },
  {
    name: "Assumption",
    file: "cutaway-body.webp",
    code: "given(lower <= upper);",
    explanation: "Require the lower bound to come first.",
    line: 10,
    closed: 48,
    gap: 0,
    height: 42,
  },
  {
    name: "Claim",
    file: "cutaway-base.webp",
    code: "expect(result).to(\n  pud.bigint().gte(lower).lte(upper)\n);",
    explanation: "The returned value stays inside both bounds.",
    line: 12,
    closed: 65,
    gap: 23,
    height: 27,
  },
] as const;

export function ExplodedView() {
  const [spread, setSpread] = useState(100);
  const [selected, setSelected] = useState(0);
  const part = parts[selected];
  const reading = useRef<HTMLDivElement>(null);
  function inspect(i: number) {
    setSelected(i);
    if (matchMedia("(max-width: 63.99rem)").matches) {
      reading.current?.focus({ preventScroll: true });
      reading.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
    }
  }

  return (
    <main className="min-h-svh overflow-hidden bg-amber-100 text-blue-950">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <header className="flex min-h-15 items-center justify-between gap-3 border-b-3 border-blue-950 sm:min-h-18">
          <a
            href="/"
            className={`inline-flex min-h-11 items-center gap-2 text-2xl font-black tracking-tighter ${focus}`}
          >
            Pud
            <span className="size-2 self-end rounded-full bg-orange-600 mb-2.5" aria-hidden="true" />
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center font-mono text-sm font-bold underline underline-offset-4 ${focus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <div className="grid lg:grid-cols-2 lg:gap-4">
          <div className="contents lg:flex lg:flex-col lg:justify-center lg:py-7">
            <div className="order-0 pt-5 sm:pt-7 lg:pt-0">
              <h1
                className="font-black tracking-tighter uppercase"
                style={{
                  fontSize: "clamp(3.2rem, 8.8vw, 9rem)",
                  lineHeight: 0.83,
                }}
              >
                Exploded
                <br className="hidden lg:block" /> View
                <span className="text-orange-600">.</span>
              </h1>
              <p className="mt-3 max-w-sm font-serif text-xl leading-tight italic sm:text-2xl lg:mt-6">
                Take a TypeScript proof apart.
              </p>
            </div>
            <div className="order-2 mt-4 border-y-2 border-blue-950 py-3 lg:mt-7 lg:max-w-md lg:py-4">
              <div className="flex flex-wrap items-center gap-x-2">
                {parts.map((p, i) => (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={i === selected}
                    onClick={() => setSelected(i)}
                    className={`min-h-11 cursor-pointer px-2 font-mono text-xs font-bold sm:px-3 ${i === selected ? "bg-blue-950 text-amber-100" : "hover:underline"} ${focus}`}
                  >
                    {i + 1}. {p.name}
                  </button>
                ))}
              </div>
              <div
                aria-live="polite"
                ref={reading}
                tabIndex={-1}
                id="cutaway-source"
                className="mt-3 scroll-m-4 focus:outline-none"
              >
                <p className="mb-1 font-mono text-xs font-bold text-blue-800">clamp.proof.ts · line {part.line}</p>
                <p className="text-sm leading-tight font-semibold">{part.explanation}</p>
                <pre className="mt-2 min-h-16 whitespace-pre-wrap wrap-anywhere font-mono text-xs leading-relaxed sm:text-sm">
                  {part.code}
                </pre>
              </div>
            </div>
          </div>
          <div className="relative order-1 mt-3 flex flex-col sm:mt-4 lg:mt-0 lg:border-l lg:border-blue-950/40 lg:py-3 lg:pl-4">
            <div className="relative isolate w-full" style={{ height: "clamp(21rem, 43vw, 40rem)" }}>
              <div
                aria-hidden="true"
                className="absolute inset-y-4 left-1/2 -z-10 border-l border-dashed border-blue-900/40"
              />
              {parts.map((p, i) => (
                <button
                  key={p.name}
                  aria-label={`Inspect ${p.name.toLowerCase()}`}
                  aria-pressed={selected === i}
                  aria-controls="cutaway-source"
                  onClick={() => inspect(i)}
                  type="button"
                  className={`group absolute left-1/2 w-11/12 max-w-xl -translate-x-1/2 -translate-y-1/2 cursor-pointer focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-blue-900 ${i === 0 ? "z-30" : i === 1 ? "z-20" : "z-10"}`}
                  style={{
                    top: `${p.closed + (spread / 100) * p.gap}%`,
                    height: `${p.height}%`,
                  }}
                >
                  <img
                    draggable="false"
                    src={`${assets}${p.file}`}
                    alt=""
                    className="size-full object-contain mix-blend-multiply transition-transform group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 font-mono text-xs font-black ${i % 2 === 0 ? "right-0" : "left-0 flex-row-reverse"}`}
                  >
                    <span className="h-px w-3 bg-blue-950 sm:w-6" />
                    <span
                      className={`inline-flex min-h-6 items-center border border-blue-950 px-1.5 text-xs ${i === selected ? "bg-blue-950 text-amber-100" : "rounded-full bg-amber-100"}`}
                    >
                      {i + 1}
                      {i === selected ? " / " + p.name : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <label className="mx-auto flex w-full max-w-sm items-center justify-between gap-3 border-y border-blue-950/60 font-mono text-xs font-bold">
              <span>Assemble</span>
              <input
                type="range"
                min="0"
                max="100"
                value={spread}
                aria-label="Explode the assembly"
                onChange={(e) => setSpread(Number(e.target.value))}
                className={`h-11 min-w-0 flex-1 cursor-ew-resize accent-orange-600 ${focus}`}
              />
              <span>Explode</span>
            </label>
          </div>
        </div>
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-x-6 border-t-2 border-blue-950 pb-4 font-mono text-xs sm:mt-6">
          <span className="py-2">Pud checks TypeScript claims with Lean.</span>
          <a
            className={`inline-flex min-h-11 items-center font-bold underline underline-offset-4 ${focus}`}
            href={`${proofLink("clamp")}#L${part.line}`}
          >
            clamp.proof.ts ↗
          </a>
        </footer>
      </div>
    </main>
  );
}
