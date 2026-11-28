"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/scenes/scene-viewport";
import { alphaEntryPath } from "@/lib/links";

const words = ["PROVE  IT.", "WRITERULES", "CHECK CODE", "FIND  BUGS"] as const;
const spoken = ["Prove it.", "Write rules.", "Check code.", "Find bugs."] as const;
const buttonFocus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";
type Change = { before: string; after: string; number: number; live: boolean };
type FaceProps = {
  letter: string;
  lower?: boolean;
  sheet?: React.Ref<HTMLSpanElement>;
};

function Face({ letter, lower = false, sheet }: FaceProps) {
  return (
    <span
      ref={sheet}
      className={`absolute inset-x-0 h-1/2 overflow-hidden backface-hidden ${
        lower
          ? "bottom-0 origin-top bg-linear-to-b from-zinc-900 to-neutral-800 text-amber-100"
          : "top-0 origin-bottom bg-linear-to-t from-neutral-800 to-zinc-700 text-amber-50"
      }`}
    >
      <span
        className={`absolute inset-x-0 flex h-[200%] scale-x-85 items-center justify-center font-sans text-[25cqw] leading-none font-black tracking-tighter sm:text-[19cqw] ${lower ? "bottom-0" : "top-0"}`}
      >
        {letter === " " ? "\u00a0" : letter}
      </span>
    </span>
  );
}

function Leaf({ before, after, order, number, live }: Change & { order: number }) {
  const upper = useRef<HTMLSpanElement>(null),
    lower = useRef<HTMLSpanElement>(null);
  const moving = live && before !== after;
  useEffect(() => {
    if (!moving || !upper.current || !lower.current) return;
    const start = order * 22;
    const top = upper.current.animate(
      [
        { transform: "rotateX(0deg)", filter: "brightness(1)" },
        { transform: "rotateX(-88deg)", filter: "brightness(.45)" },
      ],
      {
        duration: 158,
        delay: start,
        easing: "cubic-bezier(.5,0,.9,.45)",
        fill: "both",
      },
    );
    const bottom = lower.current.animate(
      [
        { transform: "rotateX(89deg)", filter: "brightness(.42)", offset: 0 },
        { transform: "rotateX(-5deg)", filter: "brightness(1)", offset: 0.68 },
        { transform: "rotateX(2deg)", offset: 0.84 },
        { transform: "rotateX(0)", offset: 1 },
      ],
      {
        duration: 207,
        delay: start + 148,
        easing: "cubic-bezier(.2,.65,.45,1)",
        fill: "both",
      },
    );
    return () => {
      top.cancel();
      bottom.cancel();
    };
  }, [moving, number, order]);
  return (
    <span
      aria-hidden="true"
      className="relative block aspect-1/2 min-w-0 overflow-hidden rounded-sm bg-black shadow-inner sm:aspect-square"
      style={{ perspective: 450 }}
    >
      <Face letter={after} />
      <Face letter={moving ? before : after} lower />
      {moving && (
        <>
          <Face letter={before} sheet={upper} />
          <Face letter={after} lower sheet={lower} />
        </>
      )}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black shadow-[0_1px_0_#ffffff25] sm:h-0.5" />
      <span className="absolute left-0 top-1/2 size-1 -translate-y-1/2 bg-zinc-950 sm:h-2" />
      <span className="absolute right-0 top-1/2 size-1 -translate-y-1/2 bg-zinc-950 sm:h-2" />
    </span>
  );
}

function soundLeaves(audio: AudioContext, before: string, after: string) {
  if (audio.state === "suspended") void audio.resume().catch(() => {});
  [...after].forEach((letter, i) => {
    if (letter === before[i]) return;
    const at = audio.currentTime + 0.17 + i * 0.022;
    for (const [hz, delay, volume] of [
      [685, 0.0, 0.018],
      [210, 0.018, 0.025],
    ]) {
      const tone = audio.createOscillator(),
        gain = audio.createGain();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(hz, at + delay);
      tone.frequency.exponentialRampToValueAtTime(hz * 0.53, at + delay + 0.018);
      gain.gain.setValueAtTime(volume, at + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + delay + 0.024);
      tone.connect(gain).connect(audio.destination);
      tone.start(at + delay);
      tone.stop(at + delay + 0.03);
      tone.onended = () => {
        tone.disconnect();
        gain.disconnect();
      };
    }
  });
}

export function SplitFlap() {
  const [index, setIndex] = useState(0);
  const [change, setChange] = useState<Change>({
    before: words[0],
    after: words[0],
    number: 0,
    live: false,
  });
  const [sound, setSound] = useState(false);
  const reduced = useReducedMotion();
  const audio = useRef<AudioContext | null>(null),
    done = useRef(0),
    intro = useRef(0),
    touched = useRef(false);
  useEffect(() => {
    if (reduced) {
      clearTimeout(done.current);
      setChange((old) => (old.live ? { ...old, live: false } : old));
      return;
    }
    if (touched.current) return;
    intro.current = window.setTimeout(() => {
      setChange({
        before: "PUD.      ",
        after: words[0],
        number: 1,
        live: true,
      });
      done.current = window.setTimeout(() => setChange((old) => ({ ...old, live: false })), 640);
    }, 200);
    return () => {
      clearTimeout(intro.current);
    };
  }, [reduced]);
  useEffect(
    () => () => {
      clearTimeout(done.current);
      if (audio.current) void audio.current.close().catch(() => {});
    },
    [],
  );
  const flip = () => {
    touched.current = true;
    clearTimeout(intro.current);
    if (change.live && !reduced) return;
    clearTimeout(done.current);
    const next = (index + 1) % words.length;
    if (sound && audio.current) soundLeaves(audio.current, words[index], words[next]);
    setIndex(next);
    setChange({
      before: words[index],
      after: words[next],
      number: change.number + 1,
      live: !reduced,
    });
    if (!reduced) done.current = window.setTimeout(() => setChange((old) => ({ ...old, live: false })), 640);
  };
  const switchSound = () => {
    if (!sound && !audio.current && window.AudioContext) audio.current = new AudioContext();
    if (!sound && audio.current?.state === "suspended") void audio.current.resume().catch(() => {});
    setSound((value) => !value);
  };
  return (
    <main className="grid min-h-svh place-items-center overflow-hidden bg-neutral-900 px-2 py-4 text-ink sm:px-8 sm:py-14">
      <article className="relative flex min-h-[76svh] w-full max-w-6xl flex-col justify-between overflow-hidden sm:block sm:min-h-0 rounded-2xl border-b-8 border-amber-300 bg-amber-100 px-3 py-5 shadow-2xl sm:rounded-3xl sm:p-6 lg:px-8">
        <header className="mb-2 flex items-center justify-between px-1 sm:mb-4">
          <a
            href="/"
            className={`flex min-h-11 items-center font-sans text-3xl leading-none font-black tracking-tighter ${buttonFocus}`}
          >
            Pud<span className="text-orange-700">.</span>
          </a>
          <a
            href={alphaEntryPath}
            className={`flex min-h-11 items-center font-mono text-sm font-bold text-neutral-950 underline underline-offset-4 ${buttonFocus}`}
          >
            Join the alpha ↗
          </a>
        </header>
        <h1 className="sr-only">Pud. Prove it.</h1>
        <button
          type="button"
          onClick={flip}
          aria-label={`${spoken[index]} Advance the split-flap board`}
          className="relative grid w-full cursor-pointer grid-cols-5 gap-1 rounded-lg border-4 border-zinc-950 bg-black p-1 focus-visible:outline-4 focus-visible:outline-orange-600 sm:gap-1.5 sm:border-8 sm:p-1.5"
          style={{ containerType: "inline-size" }}
        >
          {[...change.after].map((letter, i) => (
            <Leaf
              key={i.toString()}
              {...change}
              before={change.before[i]}
              after={letter}
              order={i}
              live={change.live && !reduced}
            />
          ))}
        </button>
        <p role="status" className="sr-only">
          {spoken[index]}
        </p>
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 pb-1 sm:mt-5">
          <p className="max-w-sm text-2xl leading-tight font-bold tracking-tight sm:text-3xl">
            Pud checks TypeScript with Lean.
          </p>
          <div className="flex items-center gap-3">
            <button
              aria-pressed={sound}
              type="button"
              onClick={switchSound}
              className={`min-h-11 cursor-pointer font-mono text-xs font-bold underline underline-offset-4 ${buttonFocus}`}
            >
              Sound {sound ? "on" : "off"}
            </button>
            <button
              type="button"
              onClick={flip}
              className={`min-h-12 cursor-pointer rounded-md border-b-4 border-orange-900 bg-orange-600 px-5 font-black text-white hover:bg-orange-700 active:translate-y-px ${buttonFocus}`}
            >
              Advance ↓
            </button>
          </div>
        </footer>
      </article>
    </main>
  );
}
