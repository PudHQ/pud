"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useReducedMotion } from "@/components/scenes/scene-viewport";
import { alphaEntryPath } from "@/lib/links";
import { cutGroove, readGroove, startAudio } from "./audio";

const tau = Math.PI * 2;
const motorSpeed = tau / 3.6;
const focusRing = "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink";

function cutPlatter(el: HTMLCanvasElement) {
  const ctx = el.getContext("2d");
  if (!ctx) return;
  el.width = el.height = 960;
  ctx.translate(480, 480);
  function circle(r: number, fill: string | CanvasGradient) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, tau);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  circle(478, "#25221f");
  circle(472, "#c5bfb2");
  for (let i = 0; i < 144; i++) {
    ctx.save();
    ctx.rotate((tau * i) / 144);
    ctx.fillStyle = i % 3 ? "#3a3936" : "#141413";
    ctx.fillRect(-2.2, -471, 4.4, i % 3 ? 13 : 18);
    ctx.fillStyle = "#f0eee4";
    ctx.fillRect(2, -469, 2, 11);
    ctx.restore();
  }
  const dark = ctx.createRadialGradient(-120, -160, 15, 0, 0, 456);
  dark.addColorStop(0, "#343332");
  dark.addColorStop(0.52, "#272625");
  dark.addColorStop(1, "#111110");
  circle(452, dark);
  for (let r = 448; r > 152; r -= 3) {
    const v = Math.round(40 + 12 * Math.sin(r * 0.22) + 8 * Math.sin(r * 0.53));
    ctx.strokeStyle = `rgb(${v} ${v} ${v - 1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, tau);
    ctx.stroke();
  }
  for (const r of [424, 362, 309, 252, 193]) {
    ctx.strokeStyle = "#0c0c0c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, tau);
    ctx.stroke();
    ctx.strokeStyle = "#484642";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, tau);
    ctx.stroke();
  }
  circle(152, "#0a0a09");
  circle(146, "#f3ead3");
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 146, 0, tau);
  ctx.clip();
  ctx.fillStyle = "#ff5b24";
  ctx.fillRect(-147, 30, 294, 130);
  ctx.fillStyle = "#1b1b19";
  ctx.textAlign = "center";
  ctx.font = "1000 96px system-ui";
  ctx.fillText("Pud.", -1, -15, 239);
  ctx.strokeStyle = "#1b1b19";
  ctx.lineWidth = 4;
  for (let line = 0; line < 5; line++) {
    ctx.beginPath();
    ctx.moveTo(-155, 58 + line * 13);
    ctx.lineTo(155, 27 + line * 13);
    ctx.stroke();
  }
  ctx.restore();
  circle(15, "#141413");
  circle(9, "#a29d8c");
  circle(4, "#ede4cf");
}

function lightPlatter(el: HTMLCanvasElement) {
  const ctx = el.getContext("2d");
  if (!ctx) return;
  el.width = el.height = 960;
  ctx.translate(480, 480);
  // Tangential highlights follow the tooling marks in the pressed vinyl.
  for (let j = 0; j < 4; j++) {
    const angle = (j * Math.PI) / 2 + 0.36;
    for (let i = 0; i < 52; i++) {
      const a = angle + (i - 26) / 134;
      ctx.strokeStyle = `rgba(240,233,212,${0.02 + 0.068 * Math.sin((i / 52) * Math.PI) ** 2})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(153 * Math.cos(a), 153 * Math.sin(a));
      ctx.lineTo(446 * Math.cos(a), 446 * Math.sin(a));
      ctx.stroke();
    }
  }
}

export function JogWheel() {
  const wheel = useRef<HTMLCanvasElement>(null);
  const light = useRef<HTMLCanvasElement>(null);
  const deck = useRef<HTMLButtonElement>(null);
  const rpm = useRef<HTMLOutputElement>(null);
  const state = useRef({ angle: 0, speed: 0, motor: true, direction: 1, sound: false });
  const drag = useRef<{ id: number; angle: number; t: number } | null>(null);
  const audio = useRef<AudioContext | undefined>(undefined);
  const groove = useRef<ReturnType<typeof cutGroove> | undefined>(undefined);
  const requestFrame = useRef<() => void>(() => {});
  const [motor, setMotor] = useState(true);
  const [direction, setDirection] = useState(1);
  const [sound, setSound] = useState(false);
  const reduced = useReducedMotion();
  const operator = useRef(false);

  useEffect(() => {
    if (wheel.current) cutPlatter(wheel.current);
    if (light.current) lightPlatter(light.current);
    return () => {
      if (audio.current) void audio.current.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (reduced && matchMedia("(prefers-reduced-motion: reduce)").matches && !operator.current) {
      state.current.motor = false;
      state.current.speed = 0;
      setMotor(false);
    }
    const scope = deck.current;
    if (!scope) return;
    let frame = 0,
      previous = 0,
      lastGrain = -1,
      inView = true;
    const s = state.current;
    const paint = () => {
      if (wheel.current) wheel.current.style.transform = `rotate(${s.angle}rad)`;
      const reading = (Math.abs(s.speed) < 0.025 ? 0 : (s.speed / tau) * 60).toFixed(1) + " rpm";
      if (rpm.current && rpm.current.value !== reading) rpm.current.value = reading;
    };
    function tick(now: number) {
      frame = 0;
      const dt = previous ? Math.min(0.04, (now - previous) / 1000) : 1 / 60;
      previous = now;
      if (!drag.current) {
        const target = s.motor ? motorSpeed * s.direction : 0;
        s.speed += (target - s.speed) * (1 - Math.exp(-dt * (s.motor ? 2.5 : 2.1)));
        if (Math.abs(s.speed) < 0.012 && !s.motor) s.speed = 0;
        s.angle += s.speed * dt;
      } else if (now - drag.current.t > 65) s.speed = 0;
      paint();
      if (s.sound && audio.current && groove.current && now - lastGrain >= 43) {
        readGroove(audio.current, groove.current, s.angle / tau, s.speed);
        lastGrain = now;
      }
      if (s.speed || s.motor || drag.current) requestFrame.current();
    }
    const wake = () => {
      if (!frame && inView && !document.hidden) frame = requestAnimationFrame(tick);
    };
    requestFrame.current = wake;
    const settle = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      wake();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      settle();
    });
    observer.observe(scope);
    document.addEventListener("visibilitychange", settle);
    paint();
    wake();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", settle);
      requestFrame.current = () => {};
    };
  }, [reduced]);

  function power() {
    operator.current = true;
    const next = !state.current.motor;
    state.current.motor = next;
    setMotor(next);
    requestFrame.current();
  }
  function reverse() {
    operator.current = true;
    state.current.direction *= -1;
    state.current.motor = true;
    setMotor(true);
    setDirection(state.current.direction);
    requestFrame.current();
  }
  function armSound() {
    const next = !sound;
    if (next) {
      audio.current = startAudio(audio.current);
      if (audio.current && !groove.current) groove.current = cutGroove(audio.current);
    }
    setSound(next);
    state.current.sound = next;
    requestFrame.current();
  }
  function pointerAngle(event: PointerEvent<HTMLButtonElement>) {
    const b = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - b.top - b.height / 2, event.clientX - b.left - b.width / 2);
  }
  function down(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current || event.button !== 0) return;
    if (sound) audio.current = startAudio(audio.current);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, angle: pointerAngle(event), t: performance.now() };
    state.current.speed = 0;
    requestFrame.current();
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const next = pointerAngle(event),
      now = performance.now(),
      delta = Math.atan2(Math.sin(next - d.angle), Math.cos(next - d.angle));
    state.current.angle += delta;
    state.current.speed = Math.max(-15, Math.min(15, delta / Math.max(0.008, (now - d.t) / 1000)));
    d.angle = next;
    d.t = now;
    requestFrame.current();
  }
  function up(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.id !== event.pointerId) return;
    if (performance.now() - drag.current.t > 70) state.current.speed = 0;
    drag.current = null;
    requestFrame.current();
  }

  const button =
    "min-h-12 border-2 border-ink px-3 text-left font-mono text-xs font-black uppercase shadow-sm active:translate-y-0.5 sm:px-4 " +
    focusRing;
  return (
    <main className="min-h-svh overflow-x-clip bg-orange-600 text-ink">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 xl:px-14">
        <nav
          aria-label="Pud"
          className="flex min-h-16 items-center justify-between border-b-2 border-ink sm:min-h-20"
        >
          <a
            href="/"
            className={`inline-flex min-h-11 items-center text-4xl font-black tracking-tighter ${focusRing}`}
          >
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className={`inline-flex min-h-11 items-center gap-3 bg-ink px-4 font-mono text-xs font-bold text-orange-400 uppercase hover:bg-black ${focusRing}`}
          >
            Join the alpha ↗
          </a>
        </nav>
        <div className="grid items-center gap-5 py-5 sm:gap-8 sm:py-8 md:grid-cols-12 md:py-10">
          <section className="min-w-0 md:col-span-4 xl:col-span-5">
            <h1 className="text-6xl leading-none font-black tracking-tighter sm:text-8xl md:text-7xl lg:text-8xl xl:text-9xl">
              Jog
              <br className="hidden md:block" /> Wheel.
            </h1>
            <p className="mt-3 max-w-64 text-base leading-tight font-semibold sm:mt-5 sm:text-xl">
              A proof runner for TypeScript.
            </p>
            <div className="mt-5 hidden max-w-65 border-t-2 border-ink pt-3 font-mono text-sm md:block">
              Grab the record. Drag to scratch.
            </div>
          </section>
          <div className="relative isolate mx-auto w-full max-w-125 rounded-3xl border-2 border-ink bg-stone-300 p-3 shadow-xl sm:p-5 md:col-span-8 md:max-w-[clamp(24rem,calc(100svh-15rem),38.75rem)] xl:col-span-7">
            <div className="flex min-h-9 items-start justify-between gap-2 px-1 font-mono text-xs font-bold uppercase">
              <span>Jog wheel</span>
              <output ref={rpm} aria-live="off">
                0.0 rpm
              </output>
            </div>
            <button
              ref={deck}
              type="button"
              aria-label="Scratchable turntable platter"
              aria-description="Drag, or jog with the left and right arrows. Enter controls the motor."
              onClick={(event) => {
                if (event.detail === 0) power();
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                operator.current = true;
                const turn = event.key === "ArrowLeft" ? -1 : 1;
                state.current.motor = false;
                setMotor(false);
                state.current.angle += turn * 0.17;
                state.current.speed = reduced ? 0 : turn * 1.8;
                requestFrame.current();
              }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onLostPointerCapture={up}
              className="relative isolate block aspect-square w-full touch-none overflow-hidden rounded-full border-4 border-ink bg-neutral-800 shadow-lg select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-orange-600 hover:cursor-grab active:cursor-grabbing"
            >
              <canvas ref={wheel} width={960} height={960} className="block size-full rounded-full" />
              <canvas
                ref={light}
                width={960}
                height={960}
                className="pointer-events-none absolute inset-0 size-full rounded-full"
              />
            </button>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">
              <button type="button" aria-pressed={motor} onClick={power} className={`${button} bg-orange-500`}>
                {motor ? "Brake" : "Spin"} <span aria-hidden="true">{motor ? "■" : "▶"}</span>
              </button>
              <button
                type="button"
                aria-label="Reverse platter direction"
                onClick={reverse}
                className={`${button} bg-stone-100`}
              >
                Reverse <span aria-hidden="true">{direction > 0 ? "↶" : "↷"}</span>
              </button>
              <button type="button" aria-pressed={sound} onClick={armSound} className={`${button} bg-stone-100`}>
                Sound {sound ? "on" : "off"}
              </button>
            </div>
          </div>
          <p className="font-mono text-xs font-bold md:hidden">Drag the record to scratch.</p>
        </div>
      </div>
    </main>
  );
}
