"use client";

import { useEffect, useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { fitType, printHalftone } from "./ink";
import { focus, loadImage, makeCanvas } from "./surface";

const sheets = [
  { name: "Proof wanted", src: "/pud-log-engraving.webp", paper: "#ff7958", ink: "#251017" },
  { name: "State it", src: "/editions/remix/bench/crew-1.webp", paper: "#d9ef43", ink: "#112d20" },
  {
    name: "Check the type",
    src: "/editions/remix/machines/tape-reader.webp",
    paper: "#283bee",
    ink: "#fff0ce",
  },
];
const rag =
  "polygon(.8% 1%,23% .5%,41% 1.2%,68% .3%,91% .8%,99.5% .2%,99.2% 24%,100% 46%,99.1% 74%,99.3% 98.4%,96% 98.1%,93% 99.4%,89% 98.3%,87% 99.4%,82% 99%,80% 98.6%,76% 99.5%,72% 98.8%,67% 99.7%,60% 98.9%,55% 99.4%,51% 98.5%,46% 99.6%,40% 98.8%,32% 99.6%,25% 98.6%,20% 99.5%,16% 99.1%,10% 99.7%,5% 98.7%,.6% 99.5%,.1% 72%,.8% 50%,0 25%)";
const proofs = new Map<number, Promise<HTMLCanvasElement>>();

function plate(index: number) {
  let promise = proofs.get(index);
  if (promise) return promise;
  const spec = sheets[index];
  promise = loadImage(spec.src).then((image) => {
    const canvas = makeCanvas(600, 780),
      c = canvas.getContext("2d");
    if (!c) return canvas;
    c.fillStyle = spec.paper;
    c.fillRect(0, 0, 600, 780);
    c.fillStyle = spec.ink;
    c.font = "bold 17px monospace";
    c.fillText("PUD  /  TYPE PROOFS", 24, 31);
    c.fillRect(23, 46, 554, 2);
    if (index === 0) {
      fitType(c, "PROOF", 9, 213, 578, 146);
      printHalftone(c, image, -7, 205, 614, 397, spec.ink, 3.5, 1.28, 0.64, 0.82);
      fitType(c, "WANTED", 8, 742, 578, 145);
    } else if (index === 1) {
      fitType(c, "STATE", 16, 207, 562, 149, "italic 900 180px Georgia, serif");
      printHalftone(c, image, 147, 184, 337, 441, spec.ink, 3.4, 1.32);
      fitType(c, "IT.", -9, 745, 352, 186, "italic 900 180px Georgia, serif");
      c.font = "bold 23px monospace";
      c.fillText("TypeScript", 389, 681);
      c.fillText("× Lean", 389, 712);
    } else {
      fitType(c, "CHECK", 16, 198, 567, 140);
      printHalftone(c, image, 2, 186, 595, 395, spec.ink, 3.7, 1.65);
      c.save();
      c.translate(14, 64);
      c.rotate(-0.08);
      fitType(c, "THE TYPE", -32, 667, 546, 123);
      c.restore();
    }
    let seed = 37 + index;
    const roll = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    c.fillStyle = spec.paper;
    for (let i = 0; i < 5800; i++) {
      c.globalAlpha = 0.32 + roll() * 0.5;
      c.fillRect(roll() * 600, roll() * 780, roll() * 1.9 + 0.55, roll() * 1.3 + 0.6);
    }
    c.globalAlpha = 1;
    const fold = c.createLinearGradient(287, 0, 318, 0);
    fold.addColorStop(0, "transparent");
    fold.addColorStop(0.46, "rgba(0,0,0,.10)");
    fold.addColorStop(0.49, "rgba(255,255,255,.20)");
    fold.addColorStop(1, "transparent");
    c.fillStyle = fold;
    c.fillRect(287, 2, 31, 773);
    return canvas;
  });
  proofs.set(index, promise);
  return promise;
}

function Paper({ index }: { index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    plate(index)
      .then((source) => {
        if (active) ref.current?.getContext("2d")?.drawImage(source, 0, 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [index]);
  return (
    <canvas
      ref={ref}
      width={600}
      height={780}
      className="block size-full"
      style={{ backgroundColor: sheets[index].paper, clipPath: rag }}
    />
  );
}

export function Flyposter() {
  const [top, setTop] = useState(0);
  const sheet = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const consumedDrag = useRef(false);
  const anim = useRef<Animation | null>(null);
  const next = (top + 1) % 3,
    last = (top + 2) % 3;
  useEffect(
    () => () => {
      anim.current?.cancel();
    },
    [],
  );
  const form = (x: number, y: number) => `translate(${x}px,${y}px) rotate(${-3 + x * 0.055}deg)`;
  function peel(direction = 1) {
    const el = sheet.current;
    if (!el || anim.current) return;
    const { x, y } = offset.current;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      offset.current = { x: 0, y: 0 };
      el.style.transform = "";
      setTop((t) => (t + 1) % 3);
      return;
    }
    const flight = el.animate(
      [
        { transform: form(x, y), opacity: 1 },
        { transform: form(direction * el.clientWidth * 1.9, -el.clientHeight * 0.42), opacity: 0 },
      ],
      { duration: 350, easing: "cubic-bezier(.35,.04,.83,.64)" },
    );
    anim.current = flight;
    flight.onfinish = () => {
      el.style.transform = "";
      offset.current = { x: 0, y: 0 };
      anim.current = null;
      setTop((t) => (t + 1) % 3);
    };
  }
  return (
    <main className="min-h-svh overflow-hidden bg-stone-950 text-orange-100">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 xl:px-12">
        <header className="flex min-h-16 items-center justify-between gap-4 sm:min-h-20">
          <a href="/" className={`text-3xl font-black tracking-tighter ${focus}`}>
            Pud.
          </a>
          <h1 className="font-serif text-xl font-bold italic sm:text-3xl">Flyposter</h1>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4 ${focus}`}
          >
            Join alpha ↗
          </a>
        </header>
      </div>
      <div
        className="relative isolate flex items-center justify-center overflow-hidden border-y-4 border-stone-700 bg-stone-800"
        style={{ height: "clamp(25rem,69svh,44rem)" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent 0 42px,#110e12 43px 46px),repeating-linear-gradient(90deg,transparent 0 145px,#110e12 146px 148px)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-2 left-0 h-full -translate-x-3/4 -rotate-9 opacity-45 sm:-translate-x-1/4 sm:opacity-50"
          style={{ aspectRatio: "10/13" }}
        >
          <Paper index={last} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-8 right-0 h-full translate-x-3/4 rotate-7 opacity-45 sm:translate-x-1/4 sm:opacity-65"
          style={{ aspectRatio: "10/13" }}
        >
          <Paper index={next} />
        </div>
        <div className="relative aspect-10/13" style={{ height: "min(86%, 104vw)" }}>
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-7 -rotate-10 shadow-2xl sm:-translate-x-16"
          >
            <Paper index={last} />
          </div>
          <div aria-hidden="true" className="absolute inset-0 translate-x-6 rotate-8 shadow-2xl sm:translate-x-14">
            <Paper index={next} />
          </div>
          <button
            type="button"
            ref={sheet}
            aria-label={`Peel ${sheets[top].name}`}
            className={`absolute inset-0 -rotate-3 cursor-grab touch-pan-y select-none drop-shadow-2xl active:cursor-grabbing ${focus}`}
            onPointerDown={(e) => {
              if (anim.current) return;
              consumedDrag.current = false;
              drag.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current || anim.current) return;
              const x = e.clientX - drag.current.x,
                y = (e.clientY - drag.current.y) * 0.58;
              offset.current = { x, y };
              e.currentTarget.style.transform = form(x, y);
            }}
            onPointerUp={(e) => {
              if (!drag.current) return;
              drag.current = null;
              if (Math.abs(offset.current.x) > 12 || Math.abs(offset.current.y) > 12) {
                consumedDrag.current = true;
                peel(offset.current.x < 0 ? -1 : 1);
              } else e.currentTarget.style.transform = "";
            }}
            onPointerCancel={(e) => {
              drag.current = null;
              offset.current = { x: 0, y: 0 };
              e.currentTarget.style.transform = "";
            }}
            onClick={() => {
              if (consumedDrag.current) {
                consumedDrag.current = false;
                return;
              }
              peel();
            }}
          >
            <Paper index={top} />
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 pt-3 pb-16 sm:px-8 lg:pt-5 xl:px-12">
        <p className="max-w-lg text-lg leading-tight font-semibold sm:text-2xl">
          TypeScript proofs, checked by Lean.
        </p>
        <button
          type="button"
          onClick={() => peel()}
          className={`min-h-11 cursor-pointer border-b border-orange-200 font-mono text-sm font-bold ${focus}`}
        >
          Peel the poster ↗
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {sheets[top].name}
        </p>
      </div>
    </main>
  );
}
