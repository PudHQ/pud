"use client";

import { useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";

const spreads = [
  {
    head: ["STOP THE", "PRESS!"],
    strap: "THE HALF-CENT AFFAIR",
    text: "We broke a currency converter on purpose. Pud caught it rounding a half-cent tie the wrong way.",
    art: 0,
    ink: "bg-lime-300",
    speech: "12½¢?",
    next: "Read the replay",
  },
  {
    head: ["SHORT BY", "A CENT."],
    strap: "THE BUN REPLAY",
    text: "On the edited function, $0.125 came back as 12¢. The rule requires 13¢.",
    art: 2,
    ink: "bg-orange-400",
    speech: "12¢!",
    next: "Print the correction",
  },
  {
    head: ["THIRTEEN", "CENTS."],
    strap: "THE CORRECTION",
    text: "Math.round sends half-cent ties up. Lean proved the original converter satisfies that rule.",
    art: 3,
    ink: "bg-violet-300",
    speech: "13¢.",
    next: "Back to page one",
  },
] as const;

const keyline = "focus-visible:outline-3 focus-visible:outline-offset-4";
const sidecar = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/cents.proof.ts";
const replay = "https://github.com/PudHQ/pud/blob/main/packages/pud/test/number.test.ts#L88-L94";
const display = { fontFamily: 'Impact, "Arial Narrow", system-ui, sans-serif' };

export function ErrantPress() {
  const [page, setPage] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  const gesture = useRef<number | null>(null);
  const story = spreads[page];
  function turn(direction: number) {
    setPage((current) => (current + direction + spreads.length) % spreads.length);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sheet.current?.animate(
        [
          {
            transform: `perspective(850px) rotateY(${direction * -7}deg) translateX(${direction * 4}%)`,
            filter: "brightness(.8)",
          },
          {
            transform: "perspective(850px) rotateY(0) translateX(0)",
            filter: "brightness(1)",
          },
        ],
        { duration: 320, easing: "cubic-bezier(.16,.76,.2,1)" },
      );
    }
  }
  return (
    <main className="min-h-svh overflow-hidden bg-ink text-ink">
      <header className="mx-auto flex min-h-13 max-w-screen-2xl items-center justify-between gap-3 px-4 text-paper sm:px-8 lg:px-12">
        <a
          href="/"
          className={`inline-flex min-h-11 items-center text-3xl font-black tracking-tighter ${keyline}`}
        >
          Pud.
        </a>
        <span className="hidden font-mono text-xs font-bold uppercase sm:block">
          TypeScript proofs, checked by Lean.
        </span>
        <a
          href={alphaEntryPath}
          className={`inline-flex min-h-11 items-center font-mono text-xs font-bold uppercase underline underline-offset-4 ${keyline}`}
        >
          Join the alpha ↗
        </a>
      </header>
      <div className="mx-auto max-w-screen-2xl px-2 pb-4 sm:px-5">
        <div
          ref={sheet}
          className={`relative flex min-h-[calc(100svh-4.4rem)] flex-col overflow-hidden px-3 sm:px-6 lg:px-10 ${story.ink}`}
        >
          <div className="flex items-center justify-between gap-3 border-b-4 border-double py-1 font-serif">
            <h1
              className="min-w-0 font-black leading-none tracking-tighter italic"
              style={{ fontSize: "clamp(1.6rem, 5.75vw, 4.4rem)" }}
            >
              The Errant Press
            </h1>
            <p className="shrink-0 whitespace-nowrap border-l-2 pl-2 text-right font-mono text-xs leading-tight font-bold uppercase">
              Proof desk
              <br />
              Page 0{page + 1} / 03
            </p>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-1 border-y-2 py-1 font-mono text-xs leading-none font-bold uppercase">
            <span>Pud · TypeScript proofs</span>
            <span>{story.strap}</span>
          </div>
          <div
            className="relative isolate grid flex-1 touch-pan-y grid-cols-1 content-center gap-y-4 pt-2 sm:grid-cols-12 sm:pt-3"
            onPointerDown={(e) => {
              if (e.button === 0) gesture.current = e.clientX;
            }}
            onPointerCancel={() => {
              gesture.current = null;
            }}
            onPointerUp={(e) => {
              if (gesture.current !== null && Math.abs(e.clientX - gesture.current) > 55)
                turn(e.clientX < gesture.current ? 1 : -1);
              gesture.current = null;
            }}
          >
            <div className="relative z-10 self-center sm:col-span-7">
              <h2
                aria-live="polite"
                className="font-black uppercase"
                style={{
                  ...display,
                  fontSize: "clamp(4.1rem,12.1vw,12.6rem)",
                  lineHeight: 0.83,
                  letterSpacing: "-.045em",
                }}
              >
                {story.head.map((line) => (
                  <span key={line} className="block whitespace-nowrap">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="mt-3 max-w-sm font-serif text-lg leading-tight font-bold sm:mt-5 sm:text-2xl">
                {story.text}
              </p>
            </div>
            <div
              className="relative isolate h-52 self-center sm:col-span-5 sm:h-auto sm:min-h-84 lg:min-h-105"
              aria-hidden="true"
            >
              <span className="absolute inset-y-0 right-0 w-4/5 -skew-x-6 bg-ink" />
              <div
                className="absolute inset-0 -rotate-3 overflow-hidden border-2 bg-amber-50 sm:inset-x-1 sm:inset-y-4"
                style={{ clipPath: "polygon(2% 0,100% 0,97% 100%,0 97%)" }}
              >
                <img
                  alt=""
                  draggable={false}
                  src={`/editions/remix/stories/flip-${story.art}.webp`}
                  className="absolute inset-0 size-full object-cover mix-blend-multiply saturate-125"
                  style={{ objectPosition: page === 1 ? "40% 50%" : "34% 50%" }}
                />
                <span className="absolute inset-x-0 bottom-0 inline-block bg-ink px-2 py-1 text-right font-mono text-xs font-bold text-amber-50">
                  Fig. 0{page + 1} / toCents
                </span>
              </div>
              <span className="absolute top-0 right-3 grid h-17 rotate-6 place-items-center whitespace-nowrap rounded-full border-4 border-ink bg-white px-3 font-serif text-3xl font-black italic sm:top-1 sm:right-4 sm:h-23 sm:px-4 sm:text-4xl">
                {story.speech}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 items-center gap-x-3 border-t-4 border-double pt-1 pb-2 sm:grid-cols-2 lg:mt-5">
            <a
              href={page === 1 ? replay : sidecar}
              className={`inline-flex min-h-11 items-center font-mono text-xs font-bold uppercase underline underline-offset-4 ${keyline}`}
            >
              {page === 1 ? "Read the regression" : "Read the proof"} ↗
            </a>
            <button
              type="button"
              onClick={() => turn(1)}
              className={`inline-flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 bg-ink px-4 text-base font-black text-paper hover:bg-zinc-800 sm:w-64 sm:justify-self-end sm:px-7 sm:text-xl ${keyline}`}
            >
              {story.next} <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
