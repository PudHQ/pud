"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { alphaEntryPath } from "@/lib/links";
import { playKey, startAudio } from "./audio";

const notes = [
  { name: "C", key: "A", position: 0 },
  { name: "C♯", key: "W", position: 0.5 },
  { name: "D", key: "S", position: 1 },
  { name: "D♯", key: "E", position: 1.5 },
  { name: "E", key: "D", position: 2 },
  { name: "F", key: "F", position: 3 },
  { name: "F♯", key: "T", position: 3.5 },
  { name: "G", key: "G", position: 4 },
  { name: "G♯", key: "Y", position: 4.5 },
  { name: "A", key: "H", position: 5 },
  { name: "A♯", key: "U", position: 5.5 },
  { name: "B", key: "J", position: 6 },
] as const;

function createKeyboard() {
  const sources = new Map<string, number>();
  const voices = new Map<number, () => void>();
  let ctx: AudioContext | undefined;
  let mute = false;
  function off(source: string) {
    const i = sources.get(source);
    if (i === undefined) return;
    sources.delete(source);
    if (![...sources.values()].includes(i)) {
      voices.get(i)?.();
      voices.delete(i);
    }
  }
  function on(source: string, i: number) {
    if (sources.get(source) === i) return;
    off(source);
    const held = [...sources.values()].includes(i);
    sources.set(source, i);
    if (!mute && !held) {
      ctx = startAudio(ctx);
      if (ctx) voices.set(i, playKey(ctx, 60 + i));
    }
  }
  function silence() {
    for (const release of voices.values()) release();
    voices.clear();
  }
  return {
    on,
    off,
    has: (source: string) => sources.has(source),
    held: () => Array.from(new Set(sources.values())),
    mute(next: boolean) {
      mute = next;
      if (next) silence();
    },
    clear() {
      silence();
      sources.clear();
    },
    dispose() {
      silence();
      sources.clear();
      if (ctx) void ctx.close().catch(() => {});
    },
  };
}

export function Keybed() {
  const board = useRef<ReturnType<typeof createKeyboard> | null>(null);
  const [active, setActive] = useState<number[]>([]);
  const chordTimer = useRef(0);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const instrument = createKeyboard();
    board.current = instrument;
    function key(event: KeyboardEvent, down: boolean) {
      const source = "key-" + event.code;
      if (!down) {
        if (instrument.has(source)) {
          instrument.off(source);
          setActive(instrument.held());
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      const id = notes.findIndex((note) => note.key === event.key.toUpperCase());
      if (id < 0) return;
      event.preventDefault();
      if (event.repeat) return;
      instrument.on(source, id);
      setActive(instrument.held());
    }
    const down = (e: KeyboardEvent) => key(e, true),
      up = (e: KeyboardEvent) => key(e, false);
    const clear = () => {
      instrument.clear();
      setActive([]);
    };
    const visibility = () => {
      if (document.hidden) clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
      window.clearTimeout(chordTimer.current);
      instrument.dispose();
      board.current = null;
    };
  }, []);
  function play(source: string, i: number) {
    board.current?.on(source, i);
    setActive(board.current?.held() ?? []);
  }
  function release(source: string) {
    board.current?.off(source);
    setActive(board.current?.held() ?? []);
  }
  function touch(event: PointerEvent<HTMLDivElement>) {
    const element = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-piano-note]");
    const source = "finger-" + event.pointerId;
    if (element && event.currentTarget.contains(element)) play(source, Number(element.dataset.pianoNote));
    else release(source);
  }
  function toggleMute() {
    board.current?.mute(!muted);
    setMuted(!muted);
  }
  function chord() {
    const instrument = board.current;
    if (!instrument) return;
    window.clearTimeout(chordTimer.current);
    for (const i of [0, 4, 7]) {
      instrument.off("chord-" + i);
      instrument.on("chord-" + i, i);
    }
    setActive(instrument.held());
    chordTimer.current = window.setTimeout(() => {
      for (const i of [0, 4, 7]) instrument.off("chord-" + i);
      setActive(instrument.held());
    }, 760);
  }
  const last = active.at(-1);
  const headline =
    last === undefined
      ? "Keybed."
      : active.length <= 3
        ? active.map((i) => notes[i].name).join("·")
        : notes[last].name;
  return (
    <main className="min-h-svh overflow-x-clip bg-blue-800 text-amber-50 selection:bg-red-500 selection:text-stone-950">
      <div className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-screen-2xl flex-col">
        <nav
          aria-label="Pud"
          className="mx-4 flex min-h-15 items-center justify-between border-b-2 border-amber-50 sm:mx-7 sm:min-h-18 lg:mx-12"
        >
          <a
            href="/"
            className="flex min-h-11 items-center text-4xl font-black tracking-tighter focus-visible:outline-2"
          >
            Pud.
          </a>
          <a
            href={alphaEntryPath}
            className="flex min-h-11 items-center bg-amber-50 px-4 font-mono text-xs font-black text-blue-900 uppercase hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Join the alpha ↗
          </a>
        </nav>
        <div className="relative isolate overflow-hidden px-4 pt-8 pb-6 sm:px-7 sm:pt-10 sm:pb-8 lg:px-12 lg:pt-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 grid grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i.toString()}
                className={
                  active.some((note) => Math.round(notes[note].position) === i) ? "bg-red-500" : "bg-transparent"
                }
              />
            ))}
          </div>
          <h1 aria-label="Keybed" className="font-black leading-none tracking-tighter uppercase">
            <span
              aria-hidden="true"
              className={`block whitespace-nowrap leading-[.78] ${last !== undefined && headline.length > 6 ? "text-[clamp(3.25rem,12vw,11rem)]" : "text-[clamp(4.6rem,17vw,16rem)]"}`}
            >
              {headline}
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base font-semibold leading-snug sm:mt-8 sm:text-xl">
            Pud is a proof runner for TypeScript.
          </p>
        </div>
        <section
          aria-label="Playable keyboard"
          className="flex flex-1 flex-col border-y-4 border-blue-950 bg-blue-950 px-1 pb-1.5"
        >
          <div className="flex min-h-12 items-center justify-between gap-2 px-3 sm:px-6 lg:px-10">
            <p className="font-mono text-xs font-bold sm:text-sm">Play A–J or touch the keys.</p>
            <button
              type="button"
              aria-pressed={muted}
              onClick={toggleMute}
              className="min-h-11 cursor-pointer px-2 font-mono text-xs font-bold underline underline-offset-4 focus-visible:outline-2"
            >
              Sound {muted ? "off" : "on"}
            </button>
          </div>
          <div
            className="relative isolate grid min-h-48 flex-1 touch-none grid-cols-7 gap-px border-t-4 border-red-500 select-none lg:min-h-49"
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              touch(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) touch(event);
            }}
            onPointerUp={(event) => release("finger-" + event.pointerId)}
            onPointerCancel={(event) => release("finger-" + event.pointerId)}
            onLostPointerCapture={(event) => release("finger-" + event.pointerId)}
          >
            {notes.map((note, i) => {
              const black = !Number.isInteger(note.position);
              const playing = active.includes(i);
              const surface = black
                ? `absolute top-0 z-10 flex h-3/5 min-w-8 sm:h-[54%] -translate-x-1/2 flex-col items-center justify-end border-x-2 border-b-8 pb-2 sm:min-w-11 ${playing ? "border-red-800 bg-red-500 text-black" : "border-blue-950 bg-stone-950 text-amber-50"}`
                : `relative flex min-w-0 flex-col justify-end border-b-8 px-1 pb-2 text-left sm:px-3 sm:pb-4 ${playing ? "border-red-800 bg-red-500 text-stone-950" : "border-stone-400 bg-amber-50 text-blue-950"}`;
              return (
                <button
                  type="button"
                  data-piano-note={i}
                  aria-label={`Play ${note.name}4, keyboard ${note.key}`}
                  aria-pressed={playing}
                  key={note.key}
                  className={`${surface} cursor-pointer focus-visible:z-20 focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-red-500`}
                  style={
                    black
                      ? { left: ((note.position + 0.5) / 7) * 100 + "%", width: "8.4%" }
                      : { gridColumn: note.position + 1 }
                  }
                  onKeyDown={(event) => {
                    if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                      event.preventDefault();
                      play("focused-" + i, i);
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      release("focused-" + i);
                    }
                  }}
                  onBlur={() => release("focused-" + i)}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      play("assist-" + i, i);
                      window.setTimeout(() => release("assist-" + i), 140);
                    }
                  }}
                >
                  <span
                    className={
                      black
                        ? "font-mono text-xs font-bold"
                        : "font-black text-2xl leading-none tracking-tighter sm:text-4xl"
                    }
                  >
                    {note.name}
                  </span>
                  <span className={black ? "font-mono text-xs opacity-75" : "mt-2 font-mono text-xs font-bold"}>
                    {note.key}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <button
          type="button"
          onClick={chord}
          className="flex min-h-14 cursor-pointer items-center justify-between gap-3 border-b-8 border-red-800 bg-red-500 px-4 text-lg font-black tracking-tight text-stone-950 hover:bg-red-400 active:border-b-4 focus-visible:outline-3 focus-visible:-outline-offset-4 sm:min-h-16 sm:px-7 sm:text-2xl lg:px-12"
        >
          <span>
            Strike a chord <span aria-hidden="true">↗</span>
          </span>
          <span className="font-mono text-sm font-bold sm:text-base">C + E + G</span>
        </button>
      </div>
    </main>
  );
}
