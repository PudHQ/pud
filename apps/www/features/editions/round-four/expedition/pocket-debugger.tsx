"use client";

import { useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { low64 } from "../../../../../../packages/pud/.examples/bigint-bits";

const keys = [7, 6, 5, 4, 3, 2, 1, 0] as const;
export function PocketDebugger() {
  const [byte, setByte] = useState(249);
  const [last, setLast] = useState<number | null>(null);
  const signed = BigInt.asIntN(8, BigInt(byte));
  const word = low64(signed).toString(16).toUpperCase().padStart(16, "0");
  function toggle(bit: number) {
    setByte((b) => b ^ (1 << bit));
    setLast(bit);
  }
  return (
    <main className="min-h-svh overflow-hidden bg-purple-950 text-amber-50 selection:bg-orange-500 selection:text-black">
      <header className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-1 sm:px-8 lg:px-12">
        <a
          href="/"
          className="inline-flex min-h-11 items-center font-pixel text-4xl font-bold tracking-tighter"
        >
          Pud.
        </a>
        <a
          href={alphaEntryPath}
          className="inline-flex min-h-11 items-center font-mono text-xs font-bold uppercase underline underline-offset-4 sm:text-sm"
        >
          Join the alpha ↗
        </a>
      </header>
      <div className="relative isolate mx-auto grid max-w-screen-2xl overflow-hidden bg-purple-700 lg:min-h-125 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.9fr)] lg:items-center">
        <div className="relative z-10 px-4 pt-5 sm:px-8 sm:pt-8 lg:pr-0 lg:pb-12 lg:pl-12">
          <p className="mb-2 inline-block border-l-4 border-orange-400 pl-2 font-mono text-xs font-bold uppercase tracking-widest text-white">
            TypeScript × Lean
          </p>
          <h1 className="font-pixel text-6xl leading-[.85] font-bold tracking-tighter sm:text-8xl lg:text-7xl xl:text-8xl">
            Pocket
            <br className="hidden lg:block" /> Debugger.
          </h1>
          <p className="mt-3 max-w-xs text-lg leading-tight font-bold sm:text-2xl">
            Flip eight input bits. Watch a signed byte become an unsigned 64-bit word.
          </p>
          <p className="mt-4 hidden max-w-xs font-mono text-xs font-bold lg:block">
            Keys 7–0 toggle individual bits →
          </p>
        </div>
        <fieldset
          className="relative min-w-0 w-full self-center"
          aria-label="Eight-bit input keyboard"
          onKeyDown={(e) => {
            if (!e.repeat && /^[0-7]$/.test(e.key)) {
              e.preventDefault();
              toggle(Number(e.key));
            }
          }}
        >
          <div className="relative mx-auto aspect-3/2 w-full">
            <img
              src="/editions/round-four/expedition/pocket-deck.webp"
              alt="An orange portable computer with a coiled cable and eight mechanical bit keys."
              width="1280"
              height="854"
              fetchPriority="high"
              className="absolute inset-0 size-full"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/20 bg-linear-to-r from-purple-700 to-transparent"
            />
            <div
              className="absolute flex flex-col justify-center overflow-hidden px-1.5 font-pixel text-lime-200 sm:px-4"
              style={{
                left: "23.5%",
                top: "23.8%",
                width: "65.4%",
                height: "31.3%",
                containerType: "inline-size",
              }}
            >
              <div className="flex items-center justify-between border-b border-lime-200/45 pb-0.5 font-mono text-[4cqw] leading-none tracking-widest">
                <span>low64(n) = n mod 2⁶⁴</span>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-between gap-1">
                <div className="min-w-0">
                  <span className="block font-mono text-[3.2cqw] leading-none text-lime-100">
                    SIGNED BYTE
                  </span>
                  <output
                    aria-live="polite"
                    aria-label="Signed input"
                    className="block text-[13cqw] leading-none font-bold tracking-tighter"
                  >
                    {signed.toString()}n
                  </output>
                </div>
                <div className="relative flex w-1/4 items-end justify-end">
                  <img
                    src="/editions/round-four/expedition/ranger.png"
                    width="76"
                    height="77"
                    alt=""
                    className="w-4/5 object-contain opacity-90 brightness-150 grayscale [image-rendering:pixelated]"
                  />
                </div>
              </div>
              <span className="block shrink-0 font-mono text-[clamp(9px,3.5cqw,15px)] leading-none text-lime-100">
                UNSIGNED HEX
              </span>
              <output
                aria-live="polite"
                aria-label="Unsigned output in hex"
                className="pb-0.5 font-mono text-[4.9cqw] leading-none font-bold tracking-wide"
              >
                {word.match(/.{2}/g)?.join(" ")}
              </output>
            </div>
            <div
              className="absolute grid grid-cols-8 gap-px"
              style={{
                left: "19.6%",
                top: "66.7%",
                width: "70.6%",
                height: "15.3%",
              }}
            >
              {keys.map((bit) => {
                const active = Boolean(byte & (1 << bit));
                return (
                  <button
                    key={bit}
                    type="button"
                    aria-label={`Toggle bit ${bit}`}
                    aria-pressed={active}
                    onClick={() => toggle(bit)}
                    className="group relative cursor-pointer rounded-sm hover:bg-orange-500/15 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-violet-950 active:bg-orange-900/25 sm:rounded-md"
                    style={{
                      boxShadow: last === bit ? "inset 0 2px 5px rgb(32 16 7 / .27)" : undefined,
                    }}
                  >
                    <i
                      className={`absolute right-1/7 bottom-1/5 size-1 rounded-full shadow-sm sm:size-1.5 ${active ? "bg-orange-600" : "bg-stone-500/60"}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>
        <label className="mx-4 mb-3 flex min-h-11 items-center gap-3 font-mono text-xs font-bold sm:mx-8 lg:hidden">
          Signed byte
          <input
            type="range"
            min="-128"
            max="127"
            value={Number(signed)}
            onChange={(e) => {
              setByte(Number(e.target.value) & 255);
              setLast(null);
            }}
            className="h-11 min-w-0 flex-1 cursor-pointer accent-orange-400"
          />
        </label>
      </div>
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-8 lg:px-12">
        <p className="text-sm font-semibold sm:text-base">
          Pud proves the same rule for every bigint. The keys select one signed byte.
        </p>
        <a
          href="https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/low-64.proof.ts#L7"
          className="inline-flex min-h-11 items-center font-mono text-xs font-bold text-orange-200 underline underline-offset-4 sm:text-sm"
        >
          Read the Lean-checked claim ↗
        </a>
      </div>
    </main>
  );
}
