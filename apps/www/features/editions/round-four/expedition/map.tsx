"use client";

import { useEffect, useRef } from "react";

const route = [
  [80, 170],
  [115, 175],
  [154, 169],
  [208, 164],
  [243, 162],
  [278, 152],
  [304, 145],
  [337, 147],
  [365, 157],
  [395, 158],
  [415, 153],
];
const stops = [0, 3, 10];
const inks: Record<string, string> = {
  k: "#39342b",
  r: "#b43826",
  R: "#fa6c33",
  y: "#ffcd69",
  p: "#f5dc9e",
  t: "#228680",
  T: "#6db3a0",
  d: "#3a5047",
  i: "#fff4cd",
  w: "#533d2f",
  s: "#aa875d",
};
const source = [
  "       kk             ",
  "       ww             ",
  "       ww    kk       ",
  "      kkkk   kk       ",
  "     kRRRRk  kk       ",
  "    kRRrRRRkkwk       ",
  "   kRRRrrRRRRRk       ",
  "  kRRRrrrRRRRRRk      ",
  " kRRRrrrrrRRRRRRk     ",
  "kRRrrrrrrrrRRRRRRk    ",
  "kkkkkkkkkkkkkkkkkk    ",
  " kpippippippipk        ",
  " kpTkkpikkpkipk        ",
  " kpktkpiktpkipk        ",
  " kpkTkpikTpkipk        ",
  " kppppppppppppk        ",
  " kpppillippwwpk        ",
  " kpppitkippwypk        ",
  " kwwwwwwwwwwwwk        ",
  " kssssssssssssk        ",
];
const claim = [
  "        kk           ",
  "       kyyk          ",
  "        ww           ",
  "        wkTTT        ",
  "        wkT          ",
  "        ww           ",
  "    kkkkkkkkkkk      ",
  "    kTTTTTTTTTk      ",
  "   ktttTiTTitttk     ",
  "  kTTTTTTTTTTTTTk    ",
  " ktttttttttttttttk   ",
  "kkkkkkkkkkkkkkkkkkk  ",
  "  kpppppikkkpppk     ",
  "  kpkkkpittkpppk     ",
  "  kpktkpittkpppk     ",
  "  kpkkkpikkkpwpk     ",
  "  kpiiiiiiiipwpk     ",
  "  kwwwwwwwwwwwwk     ",
  "  kssssssssssssk     ",
];
function building(ctx: CanvasRenderingContext2D, pattern: string[], x: number, y: number, cell: number) {
  pattern.forEach((row, r) => {
    [...row].forEach((pixel, c) => {
      if (inks[pixel]) {
        ctx.fillStyle = inks[pixel];
        ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      }
    });
  });
}
function position(t: number) {
  const i = Math.min(route.length - 2, Math.floor(t)),
    mix = t - i;
  return {
    x: route[i][0] * (1 - mix) + route[i + 1][0] * mix,
    y: route[i][1] * (1 - mix) + route[i + 1][1] * mix,
  };
}
export function CountyRoute({ stop }: { stop: number }) {
  const canvas = useRef<HTMLCanvasElement>(null),
    location = useRef(0);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const ranger = new Image();
    const from = location.current,
      to = stops[stop],
      duration = 280 + Math.abs(to - from) * 65;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0,
      start = 0,
      active = true;
    function paint(now: number) {
      if (!ctx || !active) return;
      if (!start) start = now;
      const progress = reduced || from === to ? 1 : Math.min(1, (now - start) / duration);
      const ease = progress * progress * (3 - 2 * progress);
      location.current = from + (to - from) * ease;
      ctx.clearRect(0, 0, 500, 240);
      ctx.imageSmoothingEnabled = false;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      route.forEach(([x, y], i) => {
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = "#4d492e";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = "#ffd67b";
      ctx.lineWidth = 2.7;
      ctx.stroke();
      building(ctx, source, 56, 122, 2.25);
      building(ctx, claim, 183, 119, 2.25);
      const point = position(location.current);
      const hop = progress < 1 ? Math.abs(Math.sin(progress * Math.PI * 6)) * 2.9 : 0;
      ctx.fillStyle = "rgba(35,37,22,.28)";
      ctx.fillRect(point.x - 5, point.y - 1, 11, 2);
      if (ranger.complete && ranger.naturalWidth)
        ctx.drawImage(
          ranger,
          0,
          0,
          ranger.naturalWidth,
          ranger.naturalHeight,
          Math.round(point.x - 11),
          Math.round(point.y - 23 - hop),
          23,
          23,
        );
      if (progress < 1) frame = requestAnimationFrame(paint);
    }
    ranger.onload = () => {
      if (active) {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(paint);
      }
    };
    ranger.src = "/editions/round-four/expedition/ranger.png";
    frame = requestAnimationFrame(paint);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      ranger.onload = null;
    };
  }, [stop]);
  return (
    <canvas
      ref={canvas}
      width="500"
      height="240"
      inert
      className="pointer-events-none absolute inset-0 size-full [image-rendering:pixelated]"
    />
  );
}
