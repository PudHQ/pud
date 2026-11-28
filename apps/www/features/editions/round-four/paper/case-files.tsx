"use client";

import { useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { countBatch, countFreeReference } from "../../remix/places/fixtures";

const implementation =
  "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/availability/split-count-free.ts";
const regression = "https://github.com/PudHQ/pud/blob/main/packages/pud/test/lean.test.ts#L81-L87";
const focus = "focus-visible:outline-3 focus-visible:outline-offset-4";

export function CaseFiles() {
  const [replay, setReplay] = useState<{ votes: number; expected: string; actual: string } | null>(null);
  function runReplay(count: number) {
    const ballots = Array<bigint>(count).fill(BigInt(1));
    setReplay({
      votes: count,
      expected: countFreeReference([], ballots).toString(),
      actual: countBatch([]).toString(),
    });
  }
  const mismatch = replay && replay.actual !== replay.expected;
  const paper = useRef<HTMLDivElement>(null);
  function open() {
    runReplay(1);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      paper.current?.animate(
        [
          { transform: "translateY(22%) rotate(-5deg)", opacity: 0.45 },
          { transform: "translateY(0) rotate(0)", opacity: 1 },
        ],
        { duration: 390, easing: "cubic-bezier(.14,.72,.23,1)" },
      );
  }
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-indigo-950 text-amber-50">
      <header className="mx-auto flex min-h-15 max-w-screen-2xl items-center justify-between gap-3 border-b border-indigo-300/45 px-4 font-mono sm:px-9">
        <a
          href="/"
          className={`inline-flex min-h-11 items-center font-sans text-3xl font-black tracking-tighter ${focus}`}
        >
          Pud.
        </a>
        <p className="hidden text-xs font-bold uppercase tracking-widest sm:block">
          TypeScript verification bureau
        </p>
        <a
          href={alphaEntryPath}
          className={`inline-flex min-h-11 items-center font-mono text-xs font-bold uppercase underline underline-offset-4 ${focus}`}
        >
          Join the alpha ↗
        </a>
      </header>
      <div className="relative mx-auto grid max-w-screen-2xl items-center gap-x-5 px-5 pt-3 pb-12 sm:px-9 md:grid-cols-12 md:pt-8 lg:px-14">
        <div className="relative md:col-span-5">
          <h1
            className="relative z-10 font-serif leading-none tracking-tighter italic"
            style={{ fontSize: "clamp(2.85rem,9.5vw,10.5rem)" }}
          >
            Case
            <br className="hidden md:block" /> Files.
          </h1>
          <p className="relative z-20 mt-2 max-w-48 text-sm min-[370px]:max-w-60 md:max-w-80 md:text-base leading-tight font-semibold sm:text-xl">
            Pud checks TypeScript claims with Lean. A failed check can leave a witness.
          </p>
          <div className="absolute top-0 right-0 w-18 rotate-5 bg-amber-50 px-1 pt-2 pb-1 text-indigo-950 shadow-lg min-[370px]:w-21 md:relative md:mt-4 md:w-auto md:max-w-72 md:-rotate-5 md:px-4 md:pt-2 md:pb-3">
            <div className="hidden items-baseline justify-between border-b border-indigo-950 pb-1 font-mono text-xs font-bold md:flex">
              <span>INVESTIGATOR</span>
              <span>PUD</span>
            </div>
            <img
              src="/editions/round-four/paper/pud-pencil.webp"
              alt="Pud examining a case with pencil and graph paper"
              width="820"
              height="576"
              className="mx-auto h-12 w-full object-contain mix-blend-multiply md:h-30 lg:h-36"
            />
            <div className="absolute -top-1 left-1/4 h-3 w-9 rotate-5 bg-amber-200/75 md:-top-3 md:left-2/5 md:h-6 md:w-18" />
          </div>
        </div>
        <section className="relative mt-10 min-w-0 md:col-span-7 md:mt-5">
          <div className="absolute -inset-x-1 -inset-y-1 translate-x-3 translate-y-3 -rotate-3 bg-indigo-400 shadow-2xl" />
          <div className="absolute -top-5 left-5 flex h-11 w-44 items-start justify-center rounded-t-lg bg-amber-200 pt-1 font-mono text-xs font-bold text-indigo-950">
            AVAILABILITY / 01
          </div>
          <div className="relative border-2 border-indigo-950 bg-amber-100 px-3 py-4 text-indigo-950 shadow-lg sm:p-6 lg:p-8">
            <div
              ref={paper}
              className="relative isolate min-h-72 border border-indigo-950/50 p-4 sm:min-h-91 sm:p-6"
            >
              <div className="mb-5 flex items-center justify-between gap-2 border-b-2 border-indigo-950 pb-2 font-mono text-xs font-bold uppercase">
                <span>Evidence docket</span>
                <span>CF–001</span>
              </div>
              {!replay ? (
                <>
                  <h2 className="max-w-lg font-serif text-5xl leading-none font-black tracking-tight sm:text-6xl lg:text-7xl">
                    The missing
                    <br />
                    ballot.
                  </h2>
                  <div className="absolute right-3 bottom-13 w-19 rotate-8 border-3 border-indigo-950 bg-amber-50 p-1 shadow-md sm:right-6 sm:w-30">
                    <img
                      src="/editions/remix/bench/credit-clerk.webp"
                      alt="Engraved evidence portrait of the Pud clerk"
                      width="420"
                      height="458"
                      className="block w-full mix-blend-multiply"
                    />
                    <p className="mt-1 text-center font-mono text-xs leading-none font-bold">EXHIBIT A</p>
                  </div>
                  <div className="mt-5 w-fit max-w-52 border-y-2 border-indigo-950 py-2 font-mono text-xs sm:text-sm">
                    <p>Left [] · right [1n]</p>
                    <p className="mt-1 font-black">1 vote in / 0 counted</p>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-serif text-3xl leading-none font-black tracking-tight sm:text-5xl">
                    {mismatch ? "Witness found." : "Tallies match."}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-tight sm:text-base">
                    The edit drops the right batch. Change its size to replay both tallies.
                  </p>
                  <code className="mt-4 block border-y border-indigo-950/50 py-2 text-xs">
                    return countBatch(left)
                  </code>
                  <fieldset className="mt-2 flex flex-wrap items-center gap-1">
                    <legend className="float-left mr-2 flex min-h-11 items-center font-mono text-xs">
                      Right ballots
                    </legend>
                    {[0, 1, 2, 3].map((count) => (
                      <button
                        type="button"
                        key={count}
                        aria-label={`Replay with ${count} right ballots`}
                        aria-pressed={replay.votes === count}
                        onClick={() => runReplay(count)}
                        className={`min-h-11 min-w-11 cursor-pointer border border-indigo-950 font-mono font-bold aria-pressed:bg-indigo-950 aria-pressed:text-amber-100 ${focus}`}
                      >
                        {count}
                      </button>
                    ))}
                  </fieldset>
                  <p className="mt-2 pb-5 font-mono text-sm font-bold sm:text-base" role="status">
                    Expected {replay.expected}n · got {replay.actual}n
                  </p>
                </>
              )}
              <span
                aria-hidden="true"
                className="absolute right-3 bottom-2 -rotate-7 border-3 border-red-700 px-1 font-mono text-sm leading-tight font-black text-red-700 sm:text-xl"
              >
                {replay ? "REPLAYED" : "ON FILE"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              {replay ? (
                <a
                  href={regression}
                  className={`inline-flex min-h-11 items-center bg-indigo-950 px-4 text-sm font-bold text-white ${focus}`}
                >
                  Read the regression ↗
                </a>
              ) : (
                <button
                  type="button"
                  onClick={open}
                  className={`min-h-11 cursor-pointer bg-indigo-950 px-4 text-sm font-bold text-white hover:bg-indigo-800 ${focus}`}
                >
                  Open the docket →
                </button>
              )}
              {replay ? (
                <button
                  type="button"
                  className={`min-h-11 cursor-pointer font-mono text-xs underline ${focus}`}
                  onClick={() => setReplay(null)}
                >
                  Close file
                </button>
              ) : (
                <a
                  href={implementation}
                  className={`inline-flex min-h-11 items-center font-mono text-xs underline ${focus}`}
                >
                  Source file ↗
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
