"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { alphaEntryPath } from "@/lib/links";

type Signal = { x: number; y: number; frozen: boolean };

function camera(el: HTMLCanvasElement, read: () => Signal) {
  const ctx = el.getContext("2d", { alpha: false });
  if (!ctx) return;
  const history = document.createElement("canvas");
  const back = history.getContext("2d", { alpha: false });
  if (!back) return;
  const front = ctx,
    memory = back;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0,
    phase = 0,
    visible = true,
    width = 0,
    height = 0,
    previous = 0;
  function expose() {
    const { x, y } = read(),
      t = phase;
    const cx = width * (0.44 + x * 0.08),
      cy = height * (0.53 + y * 0.07);
    front.fillStyle = "#10071a";
    front.fillRect(0, 0, width, height);
    front.save();
    front.translate(cx - width * (0.011 + x * 0.016), cy + height * (0.008 + y * 0.012));
    front.rotate(0.039 * Math.sin(t * 0.4 + 0.75) + x * 0.085);
    front.scale(0.957 + 0.009 * y, 0.957 + 0.009 * y);
    front.translate(-cx, -cy);
    front.drawImage(history, 0, 0);
    front.restore();
    const compact = width / height < 1.4;
    const size = Math.min(width * (compact ? 0.32 : 0.4), height * 0.76);
    front.save();
    front.translate(
      width * ((compact ? 0.51 : 0.57) + 0.04 * Math.sin(t * 0.3) + x * (compact ? 0.065 : 0.12)),
      height * (0.53 + 0.046 * Math.cos(t * 0.55) + y * 0.13),
    );
    front.rotate(-0.16 + 0.11 * Math.sin(t * 0.35) + y * 0.15);
    front.font = `1000 ${Math.round(size)}px system-ui, sans-serif`;
    front.textAlign = "center";
    front.textBaseline = "middle";
    front.lineJoin = "round";
    front.lineWidth = Math.max(4, size * 0.075);
    front.strokeStyle = "#fc2799";
    front.strokeText("Pud.", size * 0.014, size * 0.017);
    front.fillStyle = "#10071a";
    front.fillText("Pud.", 0, 0);
    front.lineWidth = Math.max(2, size * 0.021);
    front.strokeStyle = "#c6ff3b";
    front.strokeText("Pud.", 0, 0);
    front.restore();
    memory.drawImage(el, 0, 0);
  }
  function paint(now: number) {
    frame = 0;
    if (!width || !height) return;
    phase += previous ? Math.min(0.05, (now - previous) / 1000) : 0;
    previous = now;
    expose();
    if (!read().frozen && !reduced.matches) wake();
  }
  function wake() {
    if (!frame && visible && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function refresh() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (!read().frozen && width && (history.width !== width || history.height !== height)) {
      history.width = width;
      history.height = height;
      memory.drawImage(el, 0, 0);
    }
    if (!read().frozen && visible && !document.hidden) wake();
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.35, 1020 / Math.max(1, el.clientWidth));
    const nextWidth = Math.max(1, Math.round(el.clientWidth * dpr)),
      nextHeight = Math.max(1, Math.round(el.clientHeight * dpr));
    if (nextWidth === width && nextHeight === height) return;
    const preserve = width > 0 && read().frozen;
    width = nextWidth;
    height = nextHeight;
    if (preserve) {
      el.width = width;
      el.height = height;
      front.fillStyle = "#10071a";
      front.fillRect(0, 0, width, height);
      const ratio = Math.min(width / history.width, height / history.height);
      const frozenWidth = history.width * ratio,
        frozenHeight = history.height * ratio;
      front.drawImage(history, (width - frozenWidth) / 2, (height - frozenHeight) / 2, frozenWidth, frozenHeight);
      return;
    }
    el.width = history.width = width;
    el.height = history.height = height;
    memory.fillStyle = "#10071a";
    memory.fillRect(0, 0, width, height);
    for (let i = 0; i < 43; i++) {
      phase += 0.025;
      expose();
    }
    refresh();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(el);
  const viewport = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    refresh();
  });
  viewport.observe(el);
  document.addEventListener("visibilitychange", refresh);
  reduced.addEventListener("change", refresh);
  resize();
  return {
    adjust() {
      if (!read().frozen) wake();
    },
    refresh,
    dispose() {
      resizeObserver.disconnect();
      viewport.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      reduced.removeEventListener("change", refresh);
      cancelAnimationFrame(frame);
    },
  };
}

export function Feedback() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const signal = useRef<Signal>({ x: 0, y: 0, frozen: false });
  const device = useRef<ReturnType<typeof camera>>(undefined);
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    if (canvas.current) device.current = camera(canvas.current, () => signal.current);
    return () => {
      device.current?.dispose();
    };
  }, []);
  function freeze() {
    signal.current.frozen = !signal.current.frozen;
    setFrozen(signal.current.frozen);
    device.current?.refresh();
  }
  function steer(event: PointerEvent<HTMLCanvasElement>) {
    if (event.buttons === 0 && event.pointerType !== "mouse") return;
    const b = event.currentTarget.getBoundingClientRect();
    signal.current.x = Math.max(-1, Math.min(1, (2 * (event.clientX - b.left)) / b.width - 1));
    signal.current.y = Math.max(-1, Math.min(1, (2 * (event.clientY - b.top)) / b.height - 1));
    device.current?.adjust();
  }
  function capture() {
    const el = canvas.current;
    if (!el) return;
    if (!signal.current.frozen) freeze();
    el.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pud-feedback.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }
  const tap =
    "min-h-11 cursor-pointer px-3 font-mono text-xs font-bold uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:px-5";
  return (
    <main className="min-h-svh overflow-x-clip bg-zinc-950 text-lime-300 selection:bg-fuchsia-500 selection:text-black">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <header className="flex min-h-15 items-center justify-between gap-3 border-b border-lime-300/55 sm:min-h-18">
          <a
            href="/"
            className="flex min-h-11 items-center text-4xl leading-none font-black tracking-tighter focus-visible:outline-2"
          >
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`${tap} inline-flex items-center bg-lime-300 text-black hover:bg-lime-200`}
          >
            Join the alpha ↗
          </a>
        </header>
        <section className="grid items-end gap-x-8 gap-y-2 pt-4 pb-3 md:grid-cols-12 md:py-5">
          <h1 className="text-5xl leading-none font-black tracking-tighter uppercase italic sm:text-7xl md:col-span-8 lg:text-8xl xl:text-9xl">
            Feedback<span className="text-pink-500">.</span>
          </h1>
          <p className="max-w-62 text-sm leading-tight font-semibold text-lime-100 sm:text-base md:col-span-4 md:justify-self-end lg:text-lg">
            Pud checks proofs about your TypeScript.
          </p>
        </section>
        <div className="relative overflow-hidden border-y border-lime-300 bg-purple-950">
          <canvas
            ref={canvas}
            tabIndex={0}
            role="img"
            onKeyDown={(event) => {
              const d = signal.current;
              if (event.key === "ArrowLeft") d.x = Math.max(-1, d.x - 0.18);
              else if (event.key === "ArrowRight") d.x = Math.min(1, d.x + 0.18);
              else if (event.key === "ArrowUp") d.y = Math.max(-1, d.y - 0.18);
              else if (event.key === "ArrowDown") d.y = Math.min(1, d.y + 0.18);
              else return;
              event.preventDefault();
              device.current?.adjust();
            }}
            aria-label="An optical feedback loop repeats Pud’s lettering in acid green and magenta. Move across the frame or press the arrow keys to bend the trail."
            onPointerMove={steer}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              steer(event);
            }}
            className="block aspect-6/5 max-h-140 min-h-60 w-full cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime-300 sm:aspect-2/1 md:aspect-5/2"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-lime-300/55 py-2 sm:py-3">
          <p className="py-1 font-mono text-xs text-lime-200">
            {frozen ? "Frame frozen." : "Move to bend the signal."}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-pressed={frozen}
              onClick={freeze}
              className={`${tap} border border-lime-300 hover:bg-lime-300 hover:text-black`}
            >
              {frozen ? "Resume" : "Freeze"} <span aria-hidden="true">{frozen ? "▶" : "Ⅱ"}</span>
            </button>
            <button type="button" onClick={capture} className={`${tap} bg-pink-500 text-black hover:bg-pink-400`}>
              Save frame ↓
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
