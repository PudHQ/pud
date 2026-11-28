"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { alphaEntryPath } from "@/lib/links";

const portrait = "/editions/round-four/paper/pud-pencil.webp";
const source = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/zigzag-roundtrip.proof.ts";
const focus = "focus-visible:outline-3 focus-visible:outline-offset-4";
const inks = [
  [5, 176, 200],
  [255, 27, 101],
  [39, 21, 42],
] as const;
const equation = ["decode(", "encode(v)", ") = v"] as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function InkPortrait({ register }: { register: number }) {
  const layers = useRef<(HTMLCanvasElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      const width = img.naturalWidth,
        height = img.naturalHeight;
      const buffer = document.createElement("canvas");
      buffer.width = width;
      buffer.height = height;
      const flat = buffer.getContext("2d");
      if (!flat) return;
      flat.drawImage(img, 0, 0);
      const original = flat.getImageData(0, 0, width, height).data;
      const plates = inks.map(() => flat.createImageData(width, height));
      for (let i = 0; i < original.length; i += 4) {
        if (!original[i + 3]) continue;
        const r = original[i] / 255,
          g = original[i + 1] / 255,
          b = original[i + 2] / 255;
        const pixel = i / 4,
          x = pixel % width,
          y = Math.floor(pixel / width);
        const grain = (Math.cos((x + y * 0.28) * 1.06) + Math.cos((y - x * 0.28) * 1.06)) * 0.12;
        const shadow = clamp((0.45 - 0.3 * r - 0.59 * g - 0.11 * b) * 3.8);
        const tones = [clamp((1 - g) * 0.85 + (1 - b) * 0.33), clamp((r - g) * 1.65 + (1 - r) * 0.2), shadow];
        for (let p = 0; p < inks.length; p++) {
          const out = plates[p].data;
          const tone = tones[p];
          out[i] = inks[p][0];
          out[i + 1] = inks[p][1];
          out[i + 2] = inks[p][2];
          out[i + 3] = original[i + 3] * (tone < 0.04 ? 0 : clamp(tone + grain * (1 - tone)));
        }
      }
      for (let p = 0; p < plates.length; p++) {
        const canvas = layers.current[p];
        if (!canvas) return;
        canvas.width = width;
        canvas.height = height + 94;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.putImageData(plates[p], 0, 0);
        ctx.font = "900 56px ui-monospace, monospace";
        const total = ctx.measureText(equation.join("")).width;
        const offset = ctx.measureText(equation.slice(0, p).join("")).width;
        ctx.fillStyle = ["#003e48", "#79052f", "#27152a"][p];
        ctx.fillText(equation[p], (width - total) / 2 + offset, height + 66);
      }
      setReady(true);
    };
    img.src = portrait;
    return () => {
      disposed = true;
    };
  }, []);
  const error = (100 - register) / 100;
  return (
    <div aria-hidden="true" className="pointer-events-none relative isolate aspect-82/67 w-full">
      <img
        src={portrait}
        alt=""
        width="820"
        height="576"
        className={`absolute inset-x-0 top-0 w-full object-contain ${ready ? "invisible" : ""}`}
      />
      {inks.map((ink, index) => (
        <canvas
          key={ink[0]}
          ref={(canvas) => {
            layers.current[index] = canvas;
          }}
          className="absolute inset-0 size-full mix-blend-multiply"
          style={{
            transform: `translate(${[-8.5, 9.5, 0][index] * error}%, ${[3.8, -5.2, 0][index] * error}%) rotate(${[-3.2, 4.1, 0][index] * error}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function Overprint() {
  const [position, setPosition] = useState(0);
  const start = useRef<{ x: number; value: number } | null>(null);
  const locked = position === 100;
  function drag(e: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    const span = e.currentTarget.clientWidth * 0.48;
    setPosition(
      Math.round(100 * clamp((start.current.value + (100 * (e.clientX - start.current.x)) / span) / 100)),
    );
  }
  return (
    <main className="min-h-svh overflow-hidden bg-yellow-200 text-indigo-950">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-7 lg:px-12">
        <header className="flex min-h-15 items-center justify-between gap-2 border-b-2">
          <a
            href="/"
            className={`inline-flex min-h-11 items-center gap-3 text-3xl font-black tracking-tighter sm:text-4xl ${focus}`}
          >
            Pud.
            <span className="hidden border-l-2 pl-3 font-mono text-xs font-bold tracking-normal uppercase sm:inline">
              TypeScript proof runner
            </span>
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center bg-indigo-950 px-4 font-bold text-yellow-200 ${focus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <section className="relative isolate mt-2 grid items-center border-b-2">
          <h1
            className="relative z-10 self-start font-serif leading-none font-black tracking-tighter italic"
            style={{ fontSize: "clamp(3.7rem,10vw,10rem)", lineHeight: 0.85 }}
          >
            Overprint.
          </h1>
          <div className="relative z-0 mt-4 flex flex-col-reverse items-start gap-1 sm:mt-2 sm:grid sm:grid-cols-12 sm:items-center">
            <div className="z-10 w-full max-w-md pb-3 sm:col-span-5 sm:pb-7">
              <p className="max-w-76 font-sans text-3xl leading-none font-black tracking-tight sm:text-4xl lg:text-5xl">
                TypeScript in.
                <br />
                Proof in print.
              </p>
              <p
                aria-live="polite"
                className="mt-3 border-y border-indigo-950 py-2 font-mono text-xs leading-snug font-semibold sm:text-sm"
              >
                {locked ? (
                  <>
                    Recorded Lean result · PASS
                    <br />
                    Every signed bigint survives the round trip.
                    <span className="sr-only">decode(encode(v)) = v.</span>
                  </>
                ) : (
                  <>
                    ZigZag round trip
                    <br />
                    Register the three inks to assemble the claim.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              aria-label={locked ? "Separate the ink plates" : "Register the ink plates"}
              className={`relative z-0 mx-auto w-full cursor-ew-resize touch-pan-y select-none sm:col-span-7 ${focus}`}
              style={{ maxWidth: "min(41rem, 100%, max(22rem, 74svh))" }}
              onClick={(e) => {
                if (e.detail === 0) setPosition(locked ? 0 : 100);
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                start.current = { x: e.clientX, value: position };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={drag}
              onPointerUp={(e) => {
                if (!start.current) return;
                const delta = Math.abs(e.clientX - start.current.x);
                start.current = null;
                if (delta < 4) setPosition(locked ? 0 : 100);
              }}
              onPointerCancel={() => {
                start.current = null;
              }}
            >
              <InkPortrait register={position} />
              {!locked && (
                <span className="sr-only">The three parts of the equation occupy separate ink plates.</span>
              )}
            </button>
          </div>
        </section>
        <div className="grid items-center gap-x-5 py-2 sm:grid-cols-12">
          <label className="col-span-full flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase sm:col-span-6 lg:col-span-7">
            <span>Registration</span>
            <input
              type="range"
              className={`h-11 min-w-0 flex-1 cursor-ew-resize accent-indigo-950 ${focus}`}
              value={position}
              onChange={(e) => setPosition(Number(e.currentTarget.value))}
              min="0"
              max="100"
              aria-label="Ink plate registration"
            />
            <output className="min-w-9 text-right">{position}%</output>
          </label>
          <div className="col-span-full flex flex-wrap items-center justify-between gap-2 sm:col-span-6 sm:justify-end lg:col-span-5">
            <a
              href={source}
              className={`inline-flex min-h-11 items-center text-xs font-bold underline underline-offset-4 sm:text-sm ${focus}`}
            >
              Read the sidecar ↗
            </a>
            <button
              type="button"
              onClick={() => setPosition(locked ? 0 : 100)}
              className={`min-h-11 cursor-pointer bg-indigo-950 px-4 text-sm font-bold text-yellow-200 ${focus}`}
            >
              {locked ? "Separate inks ↺" : "Register inks →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
