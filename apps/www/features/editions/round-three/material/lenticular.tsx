"use client";

import { useEffect, useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { fitType } from "./ink";
import { fitCanvas, focus, loadImage, makeCanvas } from "./surface";

function inks(image: HTMLImageElement, under: number[], over: number[], mid: number[]) {
  const out = makeCanvas(550, 500),
    c = out.getContext("2d");
  if (!c) return out;
  const scale = Math.min(out.width / image.naturalWidth, out.height / image.naturalHeight);
  const w = image.naturalWidth * scale,
    h = image.naturalHeight * scale;
  c.drawImage(image, (out.width - w) / 2, (out.height - h) / 2, w, h);
  const pixels = c.getImageData(0, 0, out.width, out.height),
    p = pixels.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const l = (p[i] * 0.29 + p[i + 1] * 0.58 + p[i + 2] * 0.13) / 255;
    const lower = l < 0.5,
      a = lower ? under : mid,
      b = lower ? mid : over,
      t = lower ? l * 2 : (l - 0.5) * 2;
    for (let k = 0; k < 3; k++) p[i + k] = a[k] + (b[k] - a[k]) * t;
  }
  c.putImageData(pixels, 0, 0);
  return out;
}

function makePlate(image: HTMLImageElement, flip: boolean, portrait = false) {
  const plateW = portrait ? 620 : 1080,
    plateH = portrait ? 740 : 520;
  const out = makeCanvas(plateW, plateH),
    c = out.getContext("2d");
  if (!c) return out;
  const sky = c.createLinearGradient(0, 0, plateW, plateH);
  if (flip) {
    sky.addColorStop(0, "#321258");
    sky.addColorStop(0.54, "#9b1c74");
    sky.addColorStop(1, "#fc4c40");
  } else {
    sky.addColorStop(0, "#ffaf35");
    sky.addColorStop(0.55, "#ff574d");
    sky.addColorStop(1, "#eb2769");
  }
  c.fillStyle = sky;
  c.fillRect(0, 0, plateW, plateH);
  c.save();
  c.translate(portrait ? 306 : flip ? 824 : 838, portrait ? 265 : 245);
  c.rotate(-0.18);
  c.fillStyle = flip ? "#ff9489" : "#ffcf3b";
  c.beginPath();
  c.ellipse(0, 0, 263, 250, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = flip ? "#ffc6a0" : "#4c103f";
  fitType(
    c,
    flip ? "Proof." : "Pud.",
    17,
    portrait ? 699 : flip ? 354 : 357,
    portrait ? 585 : flip ? 544 : 548,
    portrait ? 171 : flip ? 205 : 234,
    flip ? "italic 900 200px Georgia, serif" : "900 200px Arial, sans-serif",
  );
  const tint = flip
    ? inks(image, [27, 7, 45], [251, 255, 130], [207, 60, 92])
    : inks(image, [87, 11, 64], [255, 232, 146], [244, 79, 69]);
  c.save();
  c.translate(portrait ? 314 : flip ? 847 : 797, 272);
  c.rotate(flip ? 0.095 : -0.095);
  c.drawImage(tint, -254, -235, 526, 477);
  c.restore();
  return out;
}

function lens(ctx: CanvasRenderingContext2D, prints: HTMLCanvasElement[], w: number, h: number, angle: number) {
  const step = Math.max(4.4, Math.min(8.4, w / 124));
  const plateW = prints[0].width,
    plateH = prints[0].height;
  const s = w / plateW,
    sh = Math.min(plateH, h / s),
    sy = (plateH - sh) / 2;
  ctx.clearRect(0, 0, w, h);
  for (let x = 0; x < w; x += step) {
    const u = x / w;
    const shift = angle * 1.75 - 0.36 - u + 0.07 * Math.sin(u * 4.1);
    const blend = Math.max(0, Math.min(1, 0.5 + shift * 3.15));
    const bWidth = step * blend,
      aWidth = step - bWidth;
    const sampleX = x / s;
    if (aWidth > 0.03) ctx.drawImage(prints[0], sampleX, sy, aWidth / s, sh, x, 0, aWidth + 0.4, h);
    if (bWidth > 0.03)
      ctx.drawImage(prints[1], sampleX + aWidth / s, sy, bWidth / s, sh, x + aWidth, 0, bWidth + 0.4, h);
    const shine = Math.exp(-shift * shift * 53);
    ctx.fillStyle = `rgba(255,240,213,${0.14 + 0.49 * shine})`;
    ctx.fillRect(x + 0.12 * step, 0, Math.max(0.65, 0.14 * step), h);
    ctx.fillStyle = "rgba(41,8,47,.32)";
    ctx.fillRect(x + 0.89 * step, 0, Math.max(0.5, 0.12 * step), h);
  }
  const gloss = ctx.createLinearGradient(0, 0, w * 0.1, h);
  gloss.addColorStop(0, "rgba(255,233,204,.28)");
  gloss.addColorStop(0.2, "rgba(255,243,213,.03)");
  gloss.addColorStop(0.57, "rgba(255,255,255,0)");
  gloss.addColorStop(1, "rgba(90,6,51,.2)");
  ctx.fillStyle = gloss;
  ctx.fillRect(0, 0, w, h);
}

export function Lenticular() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef(0.14);
  const paint = useRef<() => void>(() => {});
  const [angle, setAngle] = useState(14);
  function tilt(value: number) {
    const next = Math.min(100, Math.max(0, Math.round(value)));
    view.current = next / 100;
    setAngle(next);
    paint.current();
  }
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let active = true,
      frame = 0;
    let sources: HTMLImageElement[] = [];
    const plates = new Map<boolean, HTMLCanvasElement[]>();
    let surface = fitCanvas(el);
    const update = () => {
      frame = 0;
      if (!surface.ctx || !sources.length) return;
      const portrait = surface.width < surface.height;
      let prints = plates.get(portrait);
      if (!prints) {
        prints = sources.map((image, index) => makePlate(image, index === 1, portrait));
        plates.set(portrait, prints);
      }
      lens(surface.ctx, prints, surface.width, surface.height, view.current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    paint.current = schedule;
    Promise.all([loadImage("/pud.svg"), loadImage("/pud-followspot-operator.webp")])
      .then(([left, right]) => {
        if (!active) return;
        sources = [left, right];
        schedule();
      })
      .catch(() => {});
    const observer = new ResizeObserver(() => {
      surface = fitCanvas(el);
      schedule();
    });
    observer.observe(el);
    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      paint.current = () => {};
    };
  }, []);
  return (
    <main className="min-h-svh overflow-hidden bg-rose-950 text-orange-100">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-9 xl:px-14">
        <nav className="flex min-h-16 items-center justify-between border-b border-orange-200/50 sm:min-h-20">
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
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 py-4 sm:py-5 lg:py-6">
          <h1 className="font-serif text-5xl leading-none italic tracking-tighter sm:text-7xl lg:text-8xl">
            Lenticular.
          </h1>
          <p className="max-w-57 pb-0.5 text-sm leading-tight font-semibold sm:text-lg">
            A different angle on TypeScript proofs.
          </p>
        </header>
        <div className="relative border-2 border-orange-100/80 bg-rose-500 p-1 shadow-xl shadow-black/50 sm:p-1.5">
          <div className="relative aspect-5/6 w-full overflow-hidden border border-rose-950 bg-orange-400 sm:aspect-12/5">
            <canvas
              ref={canvas}
              aria-label="A ribbed optical print flips between Pud and a second portrait marked Proof"
              className="absolute inset-0 size-full cursor-ew-resize touch-pan-y"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const b = e.currentTarget.getBoundingClientRect();
                tilt(((e.clientX - b.left) / b.width) * 100);
              }}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse" || e.buttons) {
                  const b = e.currentTarget.getBoundingClientRect();
                  tilt(((e.clientX - b.left) / b.width) * 100);
                }
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-3 pb-16">
          <p className="text-sm font-semibold sm:text-base">Pud checks your code against a claim with Lean.</p>
          <label className="flex min-h-11 items-center gap-3 font-mono text-xs font-bold sm:text-sm">
            Tilt the print
            <input
              aria-label="Tilt the print"
              type="range"
              min="0"
              max="100"
              value={angle}
              onChange={(e) => tilt(Number(e.currentTarget.value))}
              className={`h-11 w-32 cursor-ew-resize accent-orange-300 sm:w-48 ${focus}`}
            />
          </label>
        </div>
      </div>
    </main>
  );
}
