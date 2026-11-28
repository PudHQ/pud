"use client";

import { useEffect, useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { partsOrEmpty } from "../../../../../../packages/pud/.examples/content-dispatch";

const examples = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/";
const programs = [
  {
    name: "Source",
    title: ["AFTER", "HOURS."],
    file: "content-dispatch.ts",
    caption: "TypeScript on air. Arrays keep their parts in order. Text returns an empty list.",
    href: examples + "content-dispatch.ts#L7",
    link: "Read the branch",
  },
  {
    name: "Claim",
    title: ["KEEP", "ORDER."],
    file: "content-dispatch-spec.lean",
    caption: "One rule covers both branches of the TypeScript function.",
    href: examples + "content-dispatch.proof.ts#L8",
    link: "Read the proof file",
  },
  {
    name: "Replay",
    title: ["PLAY", "BACK."],
    file: "partsOrEmpty()",
    caption: "Switch the input to run the same function here.",
    href: examples + "content-dispatch.ts#L7",
    link: "Open the implementation",
  },
];
const parts = [
  { type: "tool", toolCallId: "A" },
  { type: "tool", toolCallId: "B" },
];
export function AfterHours() {
  const [channel, setChannel] = useState(0);
  const [isText, setIsText] = useState(false);
  const replay = partsOrEmpty(isText ? "hello" : parts);
  const screen = useRef<HTMLDivElement>(null),
    tuning = useRef<{
      x: number;
      y: number;
      channel: number;
      dragged: boolean;
    } | null>(null);
  const program = programs[channel];
  const tint = ["bg-violet-950 text-yellow-200", "bg-cyan-300 text-black", "bg-rose-600 text-yellow-100"][
    channel
  ];
  useEffect(() => {
    const glass = screen.current;
    if (!glass || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const effect = glass.animate(
      [
        { filter: "blur(1.5px)", transform: "scaleY(.92) translateY(2%)" },
        { filter: "blur(0)", transform: "none" },
      ],
      { duration: 210, easing: "cubic-bezier(.1,.75,.15,1)" },
    );
    return () => effect.cancel();
  }, [channel]);
  const tune = (step: number) => setChannel((c) => (c + step + programs.length) % programs.length);
  return (
    <main className="min-h-svh overflow-hidden bg-zinc-950 text-stone-100 selection:bg-yellow-200 selection:text-black">
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-7 lg:px-12">
        <header className="flex min-h-14 items-center justify-between gap-4 border-b border-stone-600 sm:min-h-16">
          <a
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 text-3xl leading-none font-black italic tracking-tighter"
          >
            Pud
            <span className="inline-block -skew-x-12 bg-yellow-200 px-1 font-mono text-base leading-5 font-black text-black">
              TV
            </span>
          </a>
          <a
            href={alphaEntryPath}
            className="inline-flex min-h-11 items-center font-mono text-xs font-bold text-yellow-200 underline underline-offset-4 sm:text-sm"
          >
            JOIN THE ALPHA ↗
          </a>
        </header>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2 font-mono text-xs font-semibold uppercase tracking-widest">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-2 rounded-full bg-rose-500" />
            On air
          </span>
          <span className="order-3 w-full font-sans text-sm font-semibold normal-case tracking-normal text-stone-100 sm:order-none sm:w-auto">
            TypeScript proofs, checked with Lean.
          </span>
          <span aria-live="polite">
            CH. 0{channel + 1} / {program.name}
          </span>
        </div>
        <h1 className="sr-only">After Hours on Pud TV. TypeScript proofs, checked with Lean.</h1>
        <section
          aria-label="Television broadcast"
          className="relative isolate overflow-hidden rounded-sm bg-black"
        >
          <div ref={screen} className={`relative isolate flex flex-col overflow-hidden ${tint}`}>
            <div className="relative isolate h-60 overflow-hidden sm:h-76 lg:h-88 xl:h-96">
              {channel === 0 && (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute -top-1/4 -right-1/12 h-3/2 w-3/5 -rotate-8 bg-orange-500"
                  />
                  <img
                    src="/pud-followspot-operator.webp"
                    alt="Pud hosts the source broadcast from the studio."
                    width="384"
                    height="350"
                    fetchPriority="high"
                    className="absolute -right-1/12 bottom-0 h-4/5 w-2/3 object-contain object-bottom lg:right-0 lg:h-full"
                  />
                </>
              )}
              {channel === 1 && (
                <>
                  <img
                    src="/editions/remix/places/switchyard.webp"
                    alt="A train switches tracks beside the control tower."
                    width="1000"
                    height="500"
                    className="absolute inset-0 size-full object-cover object-center"
                  />
                  <div className="absolute inset-y-0 left-0 w-3/5 bg-linear-to-r from-black/80 to-transparent" />
                </>
              )}
              {channel === 2 && (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 right-0 w-3/5 -skew-x-6 bg-cyan-400"
                  />
                  <img
                    src="/editions/remix/machines/tape-reader.webp"
                    alt="Pud feeds a paper tape through the replay machine."
                    width="640"
                    height="400"
                    className="absolute -right-1/20 bottom-0 w-3/5 rotate-2 border-4 border-black drop-shadow-xl sm:right-1/14 sm:h-4/5 sm:w-auto"
                  />
                </>
              )}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 bg-crt-scanlines opacity-35 mix-blend-multiply"
              />
              <div
                className="absolute bottom-1/8 left-1/25 text-yellow-100 font-black italic tracking-tighter"
                style={{
                  fontSize: "clamp(3.9rem, 9.5vw, 10rem)",
                  lineHeight: 0.76,
                  textShadow: "3px 4px var(--color-violet-950)",
                }}
                aria-hidden="true"
              >
                {program.title[0]}
                <br />
                {program.title[1]}
              </div>
              <div
                aria-hidden="true"
                className="absolute right-3 top-3 z-20 border-2 border-black bg-yellow-200 px-2 py-0.5 font-pixel text-xl font-bold text-black"
              >
                P·TV
              </div>
            </div>
            <div className="grid gap-2 border-t-4 border-yellow-200 bg-black px-3 py-3 text-yellow-100 sm:grid-cols-[1fr_3fr] sm:items-start sm:px-5 sm:py-4">
              <p className="font-mono text-xs font-bold text-yellow-200 lg:text-sm">{program.file}</p>
              {channel === 0 && (
                <pre className="whitespace-pre-wrap break-words font-mono text-sm font-bold leading-tight sm:text-lg lg:text-2xl">
                  <code>
                    <span className="text-cyan-300">if</span> (Array.isArray(content)){" "}
                    <span className="text-orange-300">return</span> content;{"\n"}
                    <span className="text-orange-300">return</span> [];
                  </code>
                </pre>
              )}
              {channel === 1 && (
                <div>
                  <p className="font-mono text-xs text-cyan-300">ContentDispatch.keepsParts</p>
                  <code className="font-mono text-lg font-bold sm:text-2xl lg:text-3xl">
                    parts = content.getD []
                  </code>
                </div>
              )}
              {channel === 2 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-pressed={!isText}
                    onClick={() => setIsText(false)}
                    className="min-h-11 cursor-pointer border border-cyan-300 px-3 font-mono text-sm font-bold aria-pressed:bg-cyan-300 aria-pressed:text-black"
                  >
                    Parts
                  </button>
                  <button
                    type="button"
                    aria-pressed={isText}
                    onClick={() => setIsText(true)}
                    className="min-h-11 cursor-pointer border border-cyan-300 px-3 font-mono text-sm font-bold aria-pressed:bg-cyan-300 aria-pressed:text-black"
                  >
                    Text
                  </button>
                  <output
                    aria-live="polite"
                    className="font-mono text-sm font-bold text-yellow-200 sm:text-lg"
                  >
                    → [{replay.map((p) => p.toolCallId).join(", ")}]
                  </output>
                </div>
              )}
            </div>
            <p
              className="relative z-20 flex min-h-10 items-center bg-yellow-200 px-3 py-2 font-mono text-xs leading-tight font-bold text-black sm:px-5 sm:text-sm"
              aria-live="polite"
            >
              {program.caption}
            </p>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-stone-600 py-2 sm:py-3">
          <fieldset className="flex flex-wrap items-center gap-1 sm:gap-3" aria-label="Channel selector">
            <button
              type="button"
              aria-label="Tuning dial. Turn to the next channel or use arrow keys."
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                tuning.current = {
                  x: e.clientX,
                  y: e.clientY,
                  channel,
                  dragged: false,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const held = tuning.current;
                if (!held || !e.buttons) return;
                const dist = e.clientX - held.x + held.y - e.clientY;
                const ticks = Math.trunc(dist / 24);
                if (ticks || held.dragged) {
                  held.dragged = true;
                  setChannel((((held.channel + ticks) % 3) + 3) % 3);
                }
              }}
              onPointerCancel={() => {
                tuning.current = null;
              }}
              onClick={() => {
                if (!tuning.current?.dragged) tune(1);
                tuning.current = null;
              }}
              onKeyDown={(e) => {
                if (["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"].includes(e.key)) {
                  e.preventDefault();
                  tune(["ArrowRight", "ArrowUp"].includes(e.key) ? 1 : -1);
                }
              }}
              className="grid size-11 cursor-grab touch-none place-items-center rounded-full border-4 border-zinc-500 bg-zinc-800 shadow-inner active:cursor-grabbing sm:size-14"
            >
              <span
                className="block h-full w-1.5 border-t-8 border-yellow-200 motion-safe:transition-transform"
                style={{ transform: `rotate(${channel * 90 - 90}deg)` }}
              />
            </button>
            {programs.map((s, i) => (
              <button
                type="button"
                key={s.name}
                aria-pressed={channel === i}
                onClick={() => setChannel(i)}
                className="inline-flex min-h-11 cursor-pointer items-center border border-zinc-600 px-2 font-mono text-xs font-bold aria-pressed:border-yellow-200 aria-pressed:bg-yellow-200 aria-pressed:text-black sm:px-3"
              >
                <span className="mr-1 opacity-70">0{i + 1}</span>
                {s.name}
              </button>
            ))}
          </fieldset>
          <a
            href={program.href}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
          >
            {program.link} ↗
          </a>
        </div>
      </div>
    </main>
  );
}
