"use client";

import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "@/components/scenes/scene-viewport";
import { drawSum, stageNumber, type SumStage } from "./sum-drawing";
import { inspectSum } from "./sum-model";

type Props = {
  n: number;
  broken: boolean;
  stage: SumStage;
  revision: number;
  onStage: (stage: SumStage) => void;
};

const nextStage = { stack: "pair", pair: "rectangle", rectangle: "stack" } as const;

export function SumFigure({ n, broken, stage, revision, onStage }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pose = useRef<number>(stageNumber[stage]);
  const omission = useRef(Number(broken));
  const previousRevision = useRef(revision);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const context = el.getContext("2d");
    if (!context) return;

    const replay = revision !== previousRevision.current;
    previousRevision.current = revision;
    const target = stageNumber[stage];
    const from = replay ? 0 : pose.current;
    const duration = reduced ? 0 : Math.abs(from - target) * 800;
    const omissionFrom = omission.current;
    const omissionTarget = Number(broken);
    const omissionDuration = reduced ? 0 : Math.abs(omissionTarget - omissionFrom) * 550;
    const start = performance.now();
    const moving = () => pose.current !== target || omission.current !== omissionTarget;

    let width = 0,
      height = 0,
      frame = 0;
    let inView = true;
    const paint = (now: number) => {
      const t = duration ? Math.min(1, Math.max(0, (now - start) / duration)) : 1;
      const u = omissionDuration ? Math.min(1, Math.max(0, (now - start) / omissionDuration)) : 1;
      pose.current = t === 1 ? target : from + (target - from) * t;
      omission.current = u === 1 ? omissionTarget : omissionFrom + (omissionTarget - omissionFrom) * u;
      if (inView && !document.hidden && width > 0 && height > 0) {
        drawSum(context, width, height, n, broken, pose.current, omission.current);
      }
    };
    const step = (now: number) => {
      paint(now);
      frame = inView && !document.hidden && moving() ? requestAnimationFrame(step) : 0;
    };
    const resize = () => {
      if (width === el.clientWidth && height === el.clientHeight) return;
      width = el.clientWidth;
      height = el.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(1, Math.round(width * dpr));
      el.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(el.width / (width || 1), 0, 0, el.height / (height || 1), 0, 0);
      paint(performance.now());
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (inView && !document.hidden) step(performance.now());
    };
    resize();
    if (moving() && !document.hidden) frame = requestAnimationFrame(step);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    const viewport = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === inView) return;
      inView = entry.isIntersecting;
      visibility();
    });
    viewport.observe(el);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [n, broken, reduced, revision, stage]);

  const { actual: count, missing } = inspectSum(n, broken);
  const state =
    stage === "stack"
      ? `One staircase of ${count} units.`
      : stage === "pair"
        ? `Two staircases of ${count} units each, one rotated half a turn.`
        : `A ${n} by ${n + 1} rectangle with ${2 * count} occupied cells.`;
  const action =
    stage === "stack"
      ? "Rotate a second copy"
      : stage === "pair"
        ? "Join the two staircases"
        : "Return to the first staircase";
  return (
    <button
      type="button"
      aria-label={`${state} ${missing > 0 ? "Each staircase is missing its one-unit row. " : ""}${action}.`}
      onClick={() => onStage(nextStage[stage])}
      className="absolute inset-0 block size-full cursor-pointer touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink"
    >
      <canvas ref={canvas} className="absolute inset-0 block size-full" />
    </button>
  );
}
