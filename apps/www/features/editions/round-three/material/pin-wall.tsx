"use client";

import { useEffect, useRef } from "react";
import { alphaEntryPath } from "@/lib/links";
import { fitCanvas, focus, loadImage, makeCanvas } from "./surface";

const cols = 86,
  rows = 68;
const caps = Array.from({ length: 80 }, (_, i) => {
  const t = i / 79;
  return `rgb(${Math.round(58 + t * 164)} ${Math.round(43 + t * 206)} ${Math.round(107 - t * 22)})`;
});

export function PinWall() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sweep = useRef<() => void>(() => {});
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let active = true,
      ready = false,
      frame = 0,
      start = -10000,
      last = 0,
      born = 0;
    let quietTrench = false;
    let surface = fitCanvas(el);
    const relief = new Float32Array(cols * rows);
    const dents = new Float32Array(cols * rows);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const render = (time: number) => {
      frame = 0;
      if (!ready || !surface.ctx) return;
      const { ctx, width: w, height: h } = surface;
      if (!w || !h) return;
      const unit = Math.min(w / (w < 600 ? 78 : cols + rows * 0.22 + 5), h / (rows * 0.73 + 15));
      const ox = (w - (cols + rows * 0.22) * unit) / 2 + rows * 0.22 * unit;
      const oy = (h - (rows * 0.73 + cols * 0.075) * unit) / 2 + unit * 3;
      const x = (c: number, r: number) => ox + (c - r * 0.22) * unit;
      const y = (c: number, r: number) => oy + (r * 0.73 + c * 0.075) * unit;
      const board = (depth: number) => {
        ctx.beginPath();
        ctx.moveTo(x(-1, -1), y(-1, -1) + depth);
        for (const [c, r] of [
          [cols, -1],
          [cols, rows],
          [-1, rows],
        ])
          ctx.lineTo(x(c, r), y(c, r) + depth);
        ctx.closePath();
        ctx.fill();
      };
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = "#584078";
      ctx.shadowBlur = unit * 2.3;
      ctx.shadowOffsetX = unit * 1.1;
      ctx.shadowOffsetY = unit * 2;
      ctx.fillStyle = "#2f2248";
      board(unit * 2.3);
      ctx.restore();
      ctx.fillStyle = "#755b99";
      board(unit * 0.7);
      ctx.fillStyle = "#3c2e57";
      board(0);
      const t = (time - start) / 1200;
      const wave = t >= 0 && t < 1;
      const decay = reduced.matches ? 0 : Math.exp(-Math.min(0.12, (time - last) / 1000) * 2.8);
      last = time;
      let live = false;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const id = r * cols + c;
          const distance = (c + r * 0.12 - t * (cols + rows * 0.12 + 21) + 10) * 0.18;
          const notch = wave ? Math.max(0, 1 - Math.abs(distance)) : 0;
          const pressure = Math.max(dents[id], notch);
          const rise = reduced.matches ? 1 : Math.min(1, Math.max(0, (time - born) / 350 - (c / cols) * 0.85));
          const z = relief[id] * (1 - pressure) * rise;
          const px = x(c, r),
            py = y(c, r);
          const lift = unit * (z * 7 + 0.25 + notch * 0.2);
          const wPin = unit * 0.78,
            hPin = unit * 0.53;
          ctx.fillStyle = z > 0.3 ? "#514e39" : "#403752";
          ctx.fillRect(px - wPin / 2, py - lift, wPin, lift + hPin * 0.47);
          const light = Math.max(
            0,
            Math.min(79, Math.round(4 + z * 74 + notch * 5 + Math.sin(c * 0.19 + r * 0.08) * 2)),
          );
          ctx.fillStyle = caps[light];
          ctx.fillRect(px - wPin / 2, py - lift - hPin * 0.48, wPin, hPin);
          if (dents[id] > 0.008) {
            dents[id] *= decay;
            live ||= !reduced.matches;
          } else dents[id] = 0;
        }
      }
      if (live || wave || (!reduced.matches && time - born < 690)) frame = requestAnimationFrame(render);
    };
    const repaint = () => {
      if (!frame && ready) frame = requestAnimationFrame(render);
    };
    const press = (event: PointerEvent) => {
      if (!ready || (event.pointerType === "touch" && event.buttons === 0)) return;
      const bounds = el.getBoundingClientRect();
      const unit = Math.min(
        surface.width / (surface.width < 600 ? 78 : cols + rows * 0.22 + 5),
        surface.height / (rows * 0.73 + 15),
      );
      const ox = (surface.width - (cols + rows * 0.22) * unit) / 2 + rows * 0.22 * unit;
      const oy = (surface.height - (rows * 0.73 + cols * 0.075) * unit) / 2 + unit * 3;
      const px = (event.clientX - bounds.left - ox) / unit;
      const py = (event.clientY - bounds.top - oy) / unit + 2.7;
      const rr = (py - px * 0.075) / (0.73 + 0.22 * 0.075),
        cc = px + rr * 0.22;
      const radius = event.buttons ? 8 : 6;
      for (let r = Math.max(0, Math.floor(rr - radius)); r <= Math.min(rows - 1, rr + radius); r++) {
        for (let c = Math.max(0, Math.floor(cc - radius)); c <= Math.min(cols - 1, cc + radius); c++) {
          const d = Math.hypot(c - cc, r - rr) / radius;
          if (d < 1) dents[r * cols + c] = Math.max(dents[r * cols + c], Math.min(1, (1 - d) * 2.7));
        }
      }
      repaint();
    };
    sweep.current = () => {
      if (reduced.matches) {
        quietTrench = !quietTrench;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++)
            dents[r * cols + c] = quietTrench && Math.abs(c - cols / 2 + r * 0.12 - 3.5) < 5 ? 1 : 0;
      } else start = performance.now();
      repaint();
    };
    loadImage("/pud.svg")
      .then((image) => {
        if (!active) return;
        const mask = makeCanvas(cols, rows);
        const mc = mask.getContext("2d");
        if (!mc) return;
        mc.drawImage(image, 12, 3, 60, 60);
        const pixels = mc.getImageData(0, 0, cols, rows).data;
        for (let i = 0; i < relief.length; i++) {
          const p = i * 4,
            a = pixels[p + 3] / 255;
          const lum = (pixels[p] * 0.3 + pixels[p + 1] * 0.55 + pixels[p + 2] * 0.15) / 255;
          relief[i] = 0.065 + a * (0.18 + lum * 0.74);
        }
        ready = true;
        born = performance.now();
        repaint();
      })
      .catch(() => {});
    const observer = new ResizeObserver(() => {
      surface = fitCanvas(el);
      repaint();
    });
    observer.observe(el);
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointermove", press);
    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", press);
      el.removeEventListener("pointermove", press);
    };
  }, []);
  return (
    <main className="min-h-svh overflow-hidden bg-violet-200 text-violet-950">
      <div className="mx-auto max-w-screen-2xl px-5 sm:px-9 xl:px-14">
        <nav className="flex min-h-16 items-center justify-between border-b border-violet-950 sm:min-h-20">
          <a href="/" className={`text-3xl font-black tracking-tighter ${focus}`}>
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4 ${focus}`}
          >
            Join the alpha ↗
          </a>
        </nav>
        <div className="grid gap-x-2 pt-6 md:grid-cols-12 md:items-center md:py-5 lg:min-h-150">
          <header className="z-10 md:col-span-4">
            <h1 className="font-serif text-6xl leading-none tracking-tighter sm:text-7xl md:text-8xl xl:text-9xl">
              Pin
              <br className="hidden md:block" /> <em>Wall.</em>
            </h1>
            <p className="mt-3 max-w-68 text-base leading-tight sm:mt-6 sm:text-xl">
              Write the claim in TypeScript. Pud checks it with Lean.
            </p>
          </header>
          <div className="relative -mx-5 aspect-square min-w-0 sm:mx-0 md:col-span-8 md:aspect-5/3">
            <canvas
              ref={canvas}
              aria-label="Pud pressed into a bed of ultraviolet and acid-green pins"
              className="absolute inset-0 size-full cursor-crosshair touch-pan-y"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-950 pb-16 pt-1">
          <p className="font-mono text-xs font-bold">Drag across the pins.</p>
          <button
            type="button"
            onClick={() => sweep.current()}
            className={`min-h-11 cursor-pointer px-2 text-sm font-bold underline underline-offset-4 ${focus}`}
          >
            Sweep the wall →
          </button>
        </div>
      </div>
    </main>
  );
}
