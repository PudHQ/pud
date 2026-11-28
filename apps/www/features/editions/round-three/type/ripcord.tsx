"use client";
import { useEffect, useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { foldPoster, printPosters, type Posters } from "./paper";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4";
const rest = 0.102;

export function Ripcord() {
  const canvas = useRef<HTMLCanvasElement>(null),
    pad = useRef<HTMLButtonElement>(null),
    handle = useRef<HTMLButtonElement>(null);
  const [side, setSide] = useState<0 | 1>(0);
  useEffect(() => {
    const el = canvas.current,
      area = pad.current,
      tab = handle.current;
    if (!el || !area || !tab) return;
    const ctx = el.getContext("2d", { alpha: false });
    if (!ctx) return;
    let side: 0 | 1 = 0,
      progress = rest,
      target = rest,
      velocity = 0,
      grip = 0.77,
      origin = rest,
      startX = 0,
      startY = 0;
    let raf = 0,
      w = 0,
      h = 0,
      last = 0,
      pressed: number | null = null,
      moved = false,
      visible = true;
    let posters: Posters;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const paint = () => {
      if (posters && w && h) foldPoster(ctx, posters, side, w, h, progress, grip);
    };
    const finish = () => {
      side = side === 0 ? 1 : 0;
      setSide(side);
      progress = target = rest;
      velocity = 0;
      grip = 0.77;
    };
    const step = (time: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(1.8, Math.max(0.4, (time - last) / 16.67 || 1));
      last = time;
      if (media.matches || pressed !== null) {
        progress = target;
        velocity = 0;
      } else {
        velocity = (velocity + (target - progress) * 0.15 * dt) * 0.7 ** dt;
        progress = Math.min(1, Math.max(0.025, progress + velocity * dt));
      }
      if (target === 1 && progress >= 0.995) finish();
      else if (Math.abs(target - progress) + Math.abs(velocity) < 0.0007) {
        progress = target;
        velocity = 0;
      }
      paint();
      if (Math.abs(target - progress) + Math.abs(velocity) > 0.00001) raf = requestAnimationFrame(step);
    };
    const wake = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now() - 16;
        raf = requestAnimationFrame(step);
      }
    };
    const turn = () => {
      if (pressed === null) {
        target = 1;
        wake();
      }
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || pressed !== null || target === 1) return;
      pressed = event.pointerId;
      (event.currentTarget as HTMLElement).setPointerCapture(pressed);
      startX = event.clientX;
      startY = event.clientY;
      origin = progress;
      moved = false;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pressed) return;
      const delta = startX - event.clientX;
      if (Math.abs(delta) > 5) moved = true;
      if (!moved) return;
      const rect = area.getBoundingClientRect();
      grip = Math.max(0.04, Math.min(0.96, (startY * 0.43 + event.clientY * 0.57 - rect.top) / h));
      target = Math.max(0.025, Math.min(0.985, origin + delta / (w * 0.73)));
      wake();
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pressed) return;
      pressed = null;
      target =
        event.type === "pointercancel" || event.type === "lostpointercapture"
          ? rest
          : !moved || target > 0.32
            ? 1
            : rest;
      wake();
    };
    const key = (event: MouseEvent) => {
      if (event.detail === 0) turn();
    };
    const resize = () => {
      if (w === el.clientWidth && h === el.clientHeight) return;
      w = el.clientWidth;
      h = el.clientHeight;
      const density = Math.min(1.5, devicePixelRatio || 1, Math.sqrt(2e6 / Math.max(1, w * h)));
      el.width = Math.max(1, Math.round(w * density));
      el.height = Math.max(1, Math.round(h * density));
      ctx.setTransform(el.width / (w || 1), 0, 0, el.height / (h || 1), 0, 0);
      posters = printPosters(el.width, el.height);
      paint();
    };
    const watch = new ResizeObserver(resize);
    watch.observe(el);
    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    });
    view.observe(el);
    const visibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", wake);
    for (const target of [area, tab]) {
      target.addEventListener("pointerdown", down);
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
      target.addEventListener("lostpointercapture", up);
      target.addEventListener("click", key);
    }
    resize();
    return () => {
      cancelAnimationFrame(raf);
      watch.disconnect();
      view.disconnect();
      media.removeEventListener("change", wake);
      document.removeEventListener("visibilitychange", visibility);
      for (const target of [area, tab]) {
        target.removeEventListener("pointerdown", down);
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
        target.removeEventListener("lostpointercapture", up);
        target.removeEventListener("click", key);
      }
    };
  }, []);
  return (
    <main className="relative isolate flex h-svh min-h-120 flex-col overflow-hidden bg-indigo-800 text-ink">
      <h1 className="sr-only">Pud. From TypeScript to proof.</h1>
      <button
        ref={pad}
        type="button"
        aria-label={
          side === 0 ? "Turn the TypeScript sheet over to Proof" : "Turn the Proof sheet over to TypeScript"
        }
        className="absolute inset-0 touch-pan-y cursor-grab select-none active:cursor-grabbing focus-visible:outline-4 focus-visible:-outline-offset-8 focus-visible:outline-orange-500"
      >
        <canvas ref={canvas} className="absolute inset-0 size-full" />
      </button>
      <header className="pointer-events-none relative z-10 mx-4 mt-4 flex justify-between sm:mx-8 sm:mt-7 lg:mx-12">
        <a
          href="/"
          aria-label="Pud home"
          className={`pointer-events-auto flex min-h-11 items-center gap-2 bg-paper px-3 font-sans text-2xl leading-none font-black tracking-tighter ${focus}`}
        >
          <img src="/pud.svg" width="27" height="27" alt="" />
          Pud.
        </a>
        <a
          href={alphaEntryPath}
          className={`pointer-events-auto flex min-h-11 items-center bg-paper px-4 text-sm font-bold hover:underline ${focus}`}
        >
          Join the alpha ↗
        </a>
      </header>
      <footer className="pointer-events-none relative z-10 mx-4 mt-auto mb-14 flex items-end justify-between gap-3 pb-3 sm:mx-8 sm:mb-12 lg:mx-12">
        <p className="max-w-40 bg-paper sm:max-w-80 px-3 py-2 font-mono text-xs font-bold sm:text-sm">
          Pud checks TypeScript with Lean.
        </p>
        <button
          ref={handle}
          type="button"
          aria-label="Turn sheet"
          className={`pointer-events-auto flex min-h-12 shrink-0 touch-none cursor-grab select-none active:cursor-grabbing items-center gap-4 border-2 border-ink bg-orange-500 px-4 text-base font-black text-black shadow-[3px_3px_0_black] active:translate-y-px ${focus}`}
        >
          <span aria-hidden="true">⟵</span> Pull to turn
        </button>
      </footer>
      <p role="status" className="sr-only">
        {side === 0 ? "TypeScript sheet" : "Proof sheet"}
      </p>
    </main>
  );
}
