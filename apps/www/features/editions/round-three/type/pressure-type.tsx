"use client";

import { useEffect, useRef } from "react";
import { alphaEntryPath } from "@/lib/links";
import castUrl from "./pressure-cast.webp?url";
import mobileUrl from "./pressure-mobile.webp?url";
import { drawRubber, rubberGpu, type Dent } from "./rubber";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink";

export function PressureType() {
  const cast = useRef<HTMLImageElement>(null);
  const slot = useRef<HTMLSpanElement>(null);
  const pad = useRef<HTMLButtonElement>(null);
  const demonstrate = useRef<() => void>(() => {});

  useEffect(() => {
    const img = cast.current,
      host = slot.current,
      surface = pad.current;
    if (!img || !host || !surface) return;
    const hardware = document.createElement("canvas");
    let gpu = rubberGpu(hardware);
    let el = gpu ? hardware : document.createElement("canvas");
    let ctx = gpu ? null : el.getContext("2d");
    if (!gpu && !ctx) return;
    el.className = "absolute inset-0 size-full";
    host.appendChild(el);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const target: Dent = { x: 0.5, y: 0.5, dx: 0, dy: 0, depth: 0 };
    const now: Dent = { ...target };
    const velocity = { dx: 0, dy: 0, depth: 0 };
    let raf = 0,
      timeout = 0,
      pointer: number | null = null;
    let w = 0,
      h = 0,
      last = 0,
      visible = true,
      active = true;
    const print = document.createElement("canvas");
    let source = "";
    const paint = () => {
      if (img.complete && img.naturalWidth && w > 0 && h > 0) {
        if (source !== img.currentSrc) {
          print.width = img.naturalWidth;
          print.height = img.naturalHeight;
          const ink = print.getContext("2d");
          if (!ink) return;
          // An opaque substrate keeps the cast shadows continuous across warped mesh patches.
          ink.fillStyle = getComputedStyle(surface.closest("main") ?? surface).backgroundColor;
          ink.fillRect(0, 0, print.width, print.height);
          ink.drawImage(img, 0, 0);
          source = img.currentSrc;
        }
        if (gpu) gpu.draw(print, source, w, h, now);
        else if (ctx) drawRubber(ctx, print, w, h, now);
        img.style.visibility = "hidden";
      }
    };
    const update = (time: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(2, Math.max(0.4, (time - last) / 16.667 || 1));
      last = time;
      let moving = false;
      for (const field of ["dx", "dy", "depth"] as const) {
        if (preference.matches) {
          now[field] = target[field];
          velocity[field] = 0;
          continue;
        }
        const error = target[field] - now[field];
        velocity[field] = (velocity[field] + error * 0.16 * dt) * 0.69 ** dt;
        now[field] += velocity[field] * dt;
        if (Math.abs(error) + Math.abs(velocity[field]) > 0.00045) moving = true;
        else {
          now[field] = target[field];
          velocity[field] = 0;
        }
      }
      paint();
      if (moving) raf = requestAnimationFrame(update);
    };
    const wake = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now() - 16;
        raf = requestAnimationFrame(update);
      }
    };
    const release = () => {
      target.dx = 0;
      target.dy = 0;
      target.depth = 0;
      pointer = null;
      wake();
    };
    const point = (event: PointerEvent) => {
      const bounds = surface.getBoundingClientRect();
      return {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
    };
    const press = (event: PointerEvent) => {
      if (pointer !== null || event.button !== 0) return;
      clearTimeout(timeout);
      pointer = event.pointerId;
      surface.setPointerCapture(pointer);
      const p = point(event);
      now.x = target.x = p.x;
      now.y = target.y = p.y;
      target.depth = 0.86;
      wake();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      const p = point(event);
      target.dx = Math.min(0.19, Math.max(-0.19, p.x - target.x)) * 0.91;
      target.dy = Math.min(0.34, Math.max(-0.34, p.y - target.y)) * 0.8;
      wake();
    };
    const end = (event: PointerEvent) => {
      if (event.pointerId === pointer) release();
    };
    const demo = () => {
      clearTimeout(timeout);
      now.x = target.x = 0.51;
      now.y = target.y = 0.54;
      target.depth = 1;
      target.dx = 0.073;
      target.dy = 0.11;
      wake();
      timeout = window.setTimeout(release, 350);
    };
    demonstrate.current = demo;
    const keyboard = (event: MouseEvent) => {
      if (event.detail === 0) demo();
    };
    const resize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      const ratio = Math.min(1.5, devicePixelRatio || 1);
      el.width = Math.max(1, Math.round(w * ratio));
      el.height = Math.max(1, Math.round(h * ratio));
      ctx?.setTransform(el.width / (w || 1), 0, 0, el.height / (h || 1), 0, 0);
      paint();
    };
    const softwareFallback = () => {
      size.unobserve(el);
      view.unobserve(el);
      gpu?.dispose();
      gpu = null;
      const fallback = document.createElement("canvas");
      fallback.className = el.className;
      el.replaceWith(fallback);
      el = fallback;
      ctx = el.getContext("2d");
      if (!ctx) {
        img.style.visibility = "";
        return;
      }
      size.observe(el);
      view.observe(el);
      resize();
    };
    hardware.addEventListener("webglcontextlost", softwareFallback, {
      once: true,
    });
    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else release();
    });
    const size = new ResizeObserver(resize);
    size.observe(el);
    view.observe(el);
    const visibility = () => {
      if (document.hidden) release();
      else wake();
    };
    const loaded = () => {
      if (active) resize();
    };
    img.addEventListener("load", loaded);
    surface.addEventListener("pointerdown", press);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("lostpointercapture", end);
    surface.addEventListener("pointercancel", end);
    surface.addEventListener("pointerup", end);
    surface.addEventListener("click", keyboard);
    document.addEventListener("visibilitychange", visibility);
    preference.addEventListener("change", wake);
    resize();
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      size.disconnect();
      view.disconnect();
      demonstrate.current = () => {};
      gpu?.dispose();
      el.remove();
      hardware.removeEventListener("webglcontextlost", softwareFallback);
      img.style.visibility = "";
      img.removeEventListener("load", loaded);
      surface.removeEventListener("pointerdown", press);
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("lostpointercapture", end);
      surface.removeEventListener("pointercancel", end);
      surface.removeEventListener("pointerup", end);
      surface.removeEventListener("click", keyboard);
      document.removeEventListener("visibilitychange", visibility);
      preference.removeEventListener("change", wake);
    };
  }, []);
  return (
    <main className="flex min-h-svh flex-col overflow-hidden bg-vermilion text-ink">
      <div className="mx-auto flex w-full max-w-screen-2xl grow flex-col px-4 sm:px-8 lg:px-12">
        <header className="flex min-h-17 items-center justify-between border-b-2 border-ink sm:min-h-20">
          <a
            href="/"
            className={`flex min-h-11 items-center gap-2 font-sans text-2xl font-black tracking-tighter ${focus}`}
          >
            <img src="/pud.svg" width="31" height="31" alt="" />
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`flex min-h-11 items-center rounded-full bg-ink px-5 font-semibold text-orange-50 hover:bg-black ${focus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <div className="flex grow flex-col justify-center py-8 sm:py-6">
          <h1 className="sr-only">Pud pressure type</h1>
          <button
            ref={pad}
            type="button"
            aria-label="Squeeze and stretch the Pud lettering"
            className={`relative isolate block mx-auto aspect-9/10 w-full max-w-100 touch-none cursor-grab select-none active:cursor-grabbing sm:aspect-5/2 sm:max-w-none ${focus}`}
          >
            <picture>
              <source media="(max-width: 639px)" srcSet={mobileUrl} />
              <img
                ref={cast}
                src={castUrl}
                alt=""
                draggable="false"
                width="1250"
                height="518"
                fetchPriority="high"
                className="absolute inset-0 size-full"
              />
            </picture>
            <span ref={slot} className="absolute inset-0 size-full" />
          </button>
        </div>
        <footer className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 border-t-2 border-ink pb-10 pt-4 sm:pb-12 sm:pt-6">
          <p className="max-w-xl text-3xl leading-none font-black tracking-tighter text-balance sm:text-5xl">
            Pud checks TypeScript with Lean.
          </p>
          <button
            type="button"
            onClick={() => demonstrate.current()}
            className={`flex min-h-11 items-center gap-2 font-mono text-sm font-bold underline underline-offset-4 ${focus}`}
          >
            Squeeze the type ↙
          </button>
        </footer>
      </div>
    </main>
  );
}
