"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { alphaEntryPath } from "@/lib/links";
import { assets, focus, proofLink } from "./proofs";
import proofFile from "../../../../../../packages/pud/.examples/clamp.proof.ts?raw";

export function HotMetal() {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);
  const dragging = useRef(false);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const printed = progress === 100;

  function pull() {
    cancelAnimationFrame(frame.current);
    const target = printed ? 0 : 100;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(target);
      return;
    }
    const start = performance.now();
    function advance(now: number) {
      const t = Math.min(1, (now - start) / 650);
      setProgress(Math.round(progress + (target - progress) * t * t * (3 - 2 * t)));
      if (t < 1) frame.current = requestAnimationFrame(advance);
    }
    frame.current = requestAnimationFrame(advance);
  }

  function moveRoller(event: PointerEvent) {
    const rect = rail.current?.getBoundingClientRect();
    if (!rect || !dragging.current) return;
    const x = (event.clientX - rect.left) / rect.width;
    setProgress(Math.round(Math.min(1, Math.max(0, (x - 0.04) / 0.92)) * 100));
  }

  return (
    <main className="min-h-svh overflow-hidden bg-stone-950 text-stone-100">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-7 xl:px-12">
        <header className="flex min-h-14 items-center justify-between border-b border-stone-500 font-mono text-xs">
          <a href="/" className={`inline-flex min-h-11 items-center text-2xl font-black tracking-tighter ${focus}`}>
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center font-bold text-lime-300 underline underline-offset-4 ${focus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <div className="grid items-end gap-2 py-3 sm:grid-cols-5 sm:gap-3 sm:py-5">
          <h1
            className="font-serif font-black tracking-tighter text-pink-300 italic sm:col-span-3"
            style={{ fontSize: "clamp(4rem, 9vw, 9rem)", lineHeight: 0.85 }}
          >
            Hot Metal.
          </h1>
          <p className="max-w-65 text-base leading-tight font-semibold sm:col-span-2 sm:mb-1 sm:text-xl">
            Print a TypeScript proof file,
            <br className="hidden sm:block" /> checked by Lean.
          </p>
        </div>
        <div
          ref={rail}
          className="relative isolate touch-pan-y overflow-hidden border-y-8 border-stone-500 select-none"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            cancelAnimationFrame(frame.current);
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            moveRoller(e);
          }}
          onPointerMove={moveRoller}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onLostPointerCapture={() => {
            dragging.current = false;
          }}
        >
          <div className="grid h-96 cursor-ew-resize grid-cols-2 bg-stone-800 sm:h-108 md:h-116 xl:h-132">
            <div className="relative isolate overflow-hidden bg-stone-900">
              <img
                draggable="false"
                src={`${assets}letterpress-forme.webp`}
                alt="Worn cast-metal Pud type locked into the letterpress."
                className="absolute inset-0 size-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-stone-950/65 mix-blend-multiply"
                style={{ clipPath: `inset(0 ${100 - Math.min(100, progress * 2)}% 0 0)` }}
              />
            </div>
            <div className="relative overflow-hidden border-x-6 border-stone-700 bg-pink-300 text-stone-950 sm:border-x-12">
              <div className="absolute inset-2 border border-stone-950 sm:inset-5">
                <div className="flex h-full flex-col justify-between overflow-hidden px-2 py-2.5 sm:px-4 sm:py-4">
                  <div className="border-y-2 border-stone-950 py-1 font-mono text-xs font-black uppercase tracking-wide">
                    Source / clamp.ts
                  </div>
                  <div>
                    <div
                      className="origin-left -rotate-5 font-serif font-black tracking-tighter text-stone-950 italic"
                      style={{ fontSize: "clamp(2.6rem,8.6vw,9.5rem)", lineHeight: 0.95 }}
                    >
                      clamp
                    </div>
                    <div className="mt-2 font-mono text-xs font-bold sm:text-lg">value: bigint</div>
                  </div>
                  <div className="border-t-4 border-double border-stone-950 pt-2">
                    <div className="flex w-fit border border-stone-950 font-mono text-xs font-bold">
                      <span className="bg-stone-950 px-1.5 py-0.5 text-pink-300">IN</span>
                      <span className="px-1.5 py-0.5">TS</span>
                    </div>
                    <p className="mt-1 font-mono text-xs sm:text-sm">Pull for .proof.ts →</p>
                  </div>
                </div>
              </div>
              <div
                className="pointer-events-none absolute inset-2 bg-lime-300 px-2 py-3 sm:inset-5 sm:px-5 sm:py-4"
                style={{
                  clipPath: `inset(0 ${Math.max(0, 100 - Math.max(0, progress * 2 - 100))}% 0 0)`,
                }}
              >
                <div className="flex h-full flex-col justify-between border-y-2 border-stone-950 py-2">
                  <div className="font-mono text-xs font-bold uppercase tracking-wide">clamp.proof.ts</div>
                  <div className="my-2 flex min-h-0 flex-1 items-center justify-center">
                    <img
                      draggable="false"
                      src={`${assets}letterpress-impression.webp`}
                      alt=""
                      className="size-full object-contain mix-blend-multiply"
                    />
                  </div>
                  <div className="border-t-2 border-stone-950 pt-1">
                    <p className="text-xl leading-none font-black tracking-tight sm:text-3xl">PROVED.</p>
                    <p className="mt-1 font-mono text-xs leading-tight font-bold">given(lower &lt;= upper);</p>
                    <p className="mt-1 font-mono text-xs leading-tight">lower ≤ result ≤ upper</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 z-10 w-6 -translate-x-1/2 border-x-2 border-stone-950 shadow-xl sm:w-11"
            style={{
              left: `${4 + 0.92 * progress}%`,
              background:
                "linear-gradient(to right,var(--color-stone-900),var(--color-stone-500) 29%,var(--color-stone-300) 46%,var(--color-stone-600) 63%,var(--color-stone-950))",
            }}
          >
            <span className="absolute top-1/2 left-1/2 grid h-16 w-9 -translate-1/2 place-items-center rounded-full border-2 border-stone-950 bg-orange-500 font-mono font-bold text-stone-950 shadow-lg sm:h-22 sm:w-13">
              ↔
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 sm:py-5">
          <div className="flex flex-wrap items-center gap-x-3">
            <button
              type="button"
              onClick={pull}
              className={`min-h-12 cursor-pointer bg-lime-300 px-4 py-2 font-mono text-sm font-black text-stone-950 hover:bg-lime-200 ${focus}`}
            >
              {printed ? "Reset press ←" : "Pull an impression →"}
            </button>
            <span className="sr-only" role="status">
              {printed ? "Impression complete. The proof file is ready to save." : ""}
            </span>
            {printed && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(proofFile)}`}
                download="clamp.proof.ts"
                className={`inline-flex min-h-11 items-center px-1 font-mono text-sm font-bold text-pink-200 underline underline-offset-4 ${focus}`}
              >
                Save .proof.ts ↓
              </a>
            )}
          </div>
          <a
            href={proofLink("clamp")}
            className={`inline-flex min-h-11 items-center font-mono text-xs font-semibold underline underline-offset-4 ${focus}`}
          >
            Read the source ↗
          </a>
        </div>
      </div>
    </main>
  );
}
