"use client";

import { lazy, useRef, type PointerEvent } from "react";
import { SceneViewport, useReducedMotion } from "@/components/scenes/scene-viewport";
import { alphaEntryPath } from "@/lib/links";

const Model = lazy(() => import("./wobble-model"));
export type Pull = { x: number; y: number; impulse: number; down: boolean; repaint?: () => void };
const limit = (value: number) => Math.max(-1, Math.min(1, value));

export function Wobble() {
  const pull = useRef<Pull>({ x: 0, y: 0, impulse: 0, down: false });
  const start = useRef({ x: 0, y: 0 });
  const still = useRef<HTMLImageElement>(null);
  const reduced = useReducedMotion();

  function boing() {
    pull.current.impulse++;
    pull.current.repaint?.();
    if (!reduced)
      still.current?.animate(
        [
          { transform: "scale(1.24,.76) rotate(-6deg)" },
          { transform: "scale(.89,1.15) rotate(4deg)" },
          { transform: "scale(1.04,.95)" },
          { transform: "none" },
        ],
        { duration: 540, easing: "ease-out" },
      );
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!pull.current.down) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pull.current.x = limit((event.clientX - start.current.x) / (rect.width * 0.28));
    pull.current.y = limit((event.clientY - start.current.y) / (rect.height * 0.3));
    if (still.current)
      still.current.style.transform = `skewX(${-pull.current.x * 12}deg) scaleY(${1 - pull.current.y * 0.25})`;
    pull.current.repaint?.();
  }
  function release() {
    pull.current.down = false;
    pull.current.x = pull.current.y = 0;
    if (still.current) still.current.style.transform = "";
    pull.current.repaint?.();
  }

  const fallback = (
    <img
      ref={still}
      alt=""
      src="/pud.svg"
      className="absolute left-1/2 top-1/2 h-3/5 w-3/5 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-xl"
    />
  );
  return (
    <main className="flex min-h-svh flex-col overflow-hidden bg-teal-200 text-fuchsia-950">
      <header className="mx-auto flex min-h-18 w-full max-w-screen-2xl items-center justify-between gap-3 px-5 sm:px-10 lg:px-14">
        <a href="/" className="inline-flex min-h-11 items-center gap-1.5 text-2xl font-black tracking-tighter">
          <img src="/pud.svg" alt="" width="28" height="28" /> Pud.
        </a>
        <a
          href={alphaEntryPath}
          className="inline-flex min-h-11 items-center rounded-full bg-fuchsia-950 px-5 text-sm font-bold text-teal-100 hover:bg-fuchsia-800"
        >
          Get alpha access ↗
        </a>
      </header>
      <div className="relative isolate mx-auto flex min-h-115 w-full max-w-screen-2xl grow items-center justify-center sm:min-h-132">
        <h1
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 text-center font-sans text-[43vw] leading-none font-black tracking-[-.095em] text-teal-700 2xl:text-[39rem]"
          aria-label="Pud"
        >
          PUD
          <span aria-hidden="true" className="text-orange-600">
            .
          </span>
        </h1>
        <button
          type="button"
          aria-label="Wobble Pud. Drag to stretch or press to bounce."
          onClick={boing}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            start.current = { x: event.clientX, y: event.clientY };
            pull.current.down = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            pull.current.repaint?.();
          }}
          onPointerMove={move}
          onPointerUp={release}
          onLostPointerCapture={release}
          className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-8"
        >
          <SceneViewport artwork={fallback}>
            {(animate) => <Model controls={pull} animate={animate} />}
          </SceneViewport>
        </button>
      </div>
      <div className="mx-auto grid w-full max-w-screen-2xl items-end gap-2 px-5 pt-2 pb-4 sm:grid-cols-2 sm:px-10 lg:px-14">
        <p className="max-w-lg text-3xl leading-none font-black tracking-tight sm:text-4xl">
          Proofs for TypeScript.
        </p>
        <div className="flex items-center gap-4 sm:justify-self-end">
          <p className="text-sm font-semibold">Grab, stretch, let go.</p>
          <button
            type="button"
            onClick={boing}
            className="min-h-11 cursor-pointer rounded-full border-2 border-fuchsia-950 px-5 font-bold hover:bg-teal-100 active:scale-95 motion-reduce:active:scale-100"
          >
            Boing ↯
          </button>
        </div>
      </div>
    </main>
  );
}
