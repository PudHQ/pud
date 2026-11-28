"use client";

import { useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { assets, focus, proofLink, tickets } from "./proofs";

export function NightWindow() {
  const [index, setIndex] = useState(0);
  const [punched, setPunched] = useState(false);
  const clerk = useRef<HTMLImageElement>(null);
  const print = useRef<HTMLDivElement>(null);
  const ticket = tickets[index];
  const supported = ticket.status === "proved";
  const record = proofLink(ticket.file) + "#L" + ticket.line;
  const receipt = [
    "PUD / NIGHT WINDOW",
    ticket.file + ".proof.ts",
    ticket.claim,
    "Verdict: " + ticket.status,
    ticket.detail,
    "Assistant: Lean 4.19.0",
    record,
  ].join("\n");

  function ring() {
    if (punched) {
      setIndex((index + 1) % tickets.length);
      setPunched(false);
      return;
    }
    setPunched(true);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clerk.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.045) translateY(1.5%)", offset: 0.38 },
        { transform: "scale(1)" },
      ],
      { duration: 430, easing: "ease-out" },
    );
    print.current?.animate(
      [
        { transform: "translateY(88%) rotate(4deg)", opacity: 0 },
        {
          transform: "translateY(-4%) rotate(-3deg)",
          opacity: 1,
          offset: 0.78,
        },
        { transform: "rotate(-2deg)" },
      ],
      { duration: 560, easing: "ease-out" },
    );
  }

  return (
    <main className="min-h-svh overflow-hidden bg-blue-950 text-amber-100">
      <div className="mx-auto max-w-screen-2xl px-3 pt-1 sm:px-7 lg:px-12">
        <header className="flex min-h-14 items-center justify-between border-b-2 border-amber-100/65">
          <a
            href="/"
            className={`inline-flex min-h-11 items-center font-mono text-2xl font-black tracking-tighter ${focus}`}
          >
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider underline underline-offset-4 ${focus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <div className="mt-3 border-x-4 border-t-4 border-blue-950 bg-amber-100 shadow-xl sm:mt-5">
          <div
            aria-hidden="true"
            className="h-6 border-y-4 border-red-950 sm:h-9"
            style={{
              background: "repeating-linear-gradient(106deg,var(--color-red-600) 0 6%,var(--color-amber-100) 6% 12%)",
            }}
          />
          <div className="grid bg-red-950 lg:grid-cols-5">
            <section className="relative isolate flex flex-col justify-center overflow-hidden border-b-8 border-red-950 bg-red-700 px-5 py-5 text-amber-100 sm:px-8 lg:col-span-2 lg:border-r-8 lg:border-b-0 lg:py-10">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 -z-10 border border-amber-200/70 outline outline-offset-2 outline-amber-100/30 sm:inset-3"
              />
              <h1 aria-label="Night Window" className="leading-none">
                <span className="block font-serif text-6xl leading-none font-semibold tracking-tight italic sm:text-8xl xl:text-9xl">
                  Night
                </span>
                <span className="block origin-left scale-y-110 text-5xl leading-none font-black tracking-tighter uppercase sm:text-7xl lg:text-6xl xl:text-7xl">
                  Window
                </span>
              </h1>
              <p className="mt-4 max-w-66 font-serif text-lg leading-tight sm:text-2xl lg:mt-7">
                TypeScript proofs,
                <br className="hidden lg:block" /> checked by Lean.
              </p>
            </section>
            <div
              className="relative isolate overflow-hidden border-x-4 border-blue-950 bg-amber-300 lg:col-span-3"
              style={{ minHeight: "clamp(16rem, 36vw, 36rem)" }}
            >
              <div className="relative h-64 sm:h-80 lg:absolute lg:inset-0 lg:h-auto">
                <img
                  ref={clerk}
                  src={`${assets}window-clerk.webp`}
                  alt="Pud at his night window with a brass ticket punch."
                  className="absolute inset-0 size-full object-cover object-center"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 border-x-5 border-red-950/75 shadow-inner"
                />
                <button
                  type="button"
                  aria-label={punched ? "Collect the next claim" : "Operate the ticket punch"}
                  onClick={ring}
                  className="absolute inset-0 cursor-pointer focus-visible:outline-4 focus-visible:-outline-offset-6 focus-visible:outline-amber-200"
                />
              </div>
              <div
                ref={print}
                aria-hidden={!punched}
                className={`relative z-10 mx-auto -mt-6 mb-4 w-11/12 max-w-96 -rotate-2 border-y-4 border-dotted border-blue-950 px-3 py-2 text-blue-950 shadow-2xl sm:px-5 sm:py-3 lg:absolute lg:right-7 lg:bottom-5 lg:m-0 lg:w-4/5 ${supported ? "bg-amber-100" : "bg-sky-100"} ${punched ? "block" : "hidden"}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-blue-950 pb-1 font-mono text-xs font-black">
                  NIGHT WINDOW <span>CLAIM / 0{index + 1}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src="/editions/remix/bench/credit-clerk.webp"
                    alt=""
                    className="w-11 rounded-full mix-blend-multiply sm:w-16"
                  />
                  <div>
                    <span
                      className={`block leading-none font-black tracking-tighter ${supported ? "text-3xl text-red-700 sm:text-5xl" : "text-xl text-blue-800 sm:text-3xl"}`}
                    >
                      {ticket.status.toUpperCase()}.
                    </span>
                    <span className="font-mono text-xs font-semibold">Lean 4.19 · {ticket.name}</span>
                  </div>
                </div>
                <p className="mt-2 border-b border-dashed border-blue-950 pb-2 text-sm leading-tight font-semibold sm:text-lg">
                  {ticket.claim}
                </p>
                {!supported && <p className="mt-2 font-mono text-xs leading-tight">{ticket.detail}</p>}
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(receipt)}`}
                  download={ticket.file + "-receipt.txt"}
                  tabIndex={punched ? 0 : -1}
                  className={`inline-flex min-h-11 items-center font-mono text-xs font-black underline underline-offset-4 ${focus}`}
                >
                  Take receipt ↓
                </a>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="h-4 border-y-4 border-red-950 bg-red-500 shadow-md sm:h-6" />
        </div>
        <div className="grid border-b border-amber-100/50 pb-4 sm:grid-cols-5">
          <section className="flex items-center justify-between gap-3 px-1 py-3 sm:col-span-3 sm:gap-6 sm:pr-8">
            <div aria-live="polite">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-amber-300">
                {punched ? "Recorded Lean result" : "At the window"} · {ticket.file}.proof.ts
              </p>
              <p className="max-w-lg text-base leading-tight font-semibold sm:text-xl">
                {punched ? (supported ? ticket.detail : "This loop cannot be translated to Lean.") : ticket.claim}
              </p>
            </div>
          </section>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 sm:justify-end sm:gap-5 sm:pt-2">
            <button
              type="button"
              onClick={ring}
              className={`min-h-12 cursor-pointer border-b-4 border-amber-600 bg-amber-200 px-4 py-2 font-mono text-sm font-bold text-blue-950 hover:bg-amber-100 active:translate-y-0.5 ${focus}`}
            >
              {punched ? "Next claim →" : "Punch my ticket ↓"}
            </button>
            <a
              href={record}
              className={`inline-flex min-h-11 items-center font-mono text-xs font-semibold underline underline-offset-4 ${focus}`}
            >
              Read file ↗
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
