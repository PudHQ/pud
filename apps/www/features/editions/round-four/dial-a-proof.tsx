"use client";

import { useEffect, useRef, useState } from "react";
import { alphaEntryPath } from "@/lib/links";
import { startAudio } from "../round-three/sound/audio";
import { HotlineOperator } from "./hotline-operator";
import { inspectSum } from "../remix/midnight-impact/sum-model";
import { fixtureRoot } from "../remix/bench-ui";

const calls = [
  {
    name: "First match",
    file: "linear-search.proof.ts",
    status: "Proved",
    description: "Lean certified that linearSearch returns the first matching index, or −1 when the target is absent.",
    href: fixtureRoot + "linear-search.proof.ts#L8",
    link: "Read the claim",
  },
  {
    name: "Missing one",
    file: "countdown-sum.proof.ts",
    status: "Disproved",
    description: "Change the loop guard from > 0n to > 1n. At 1n, Bun replayed the function and got 0n. The claim requires 1n.",
    href: "/editions/midnight-impact",
    link: "Inspect the loop",
  },
  {
    name: "Indexed loop",
    file: "sum-positive.ts",
    status: "Unsupported",
    description: "The Lean adapter stops at the indexed for loop on line 4. This run gives no verdict on the total.",
    href: fixtureRoot + "sum-positive.ts#L4",
    link: "Inspect line 4",
  },
] as const;

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4";
const lights = ["bg-lime-300", "bg-red-400", "bg-amber-300"] as const;

function playExtension(audio: AudioContext, index: number) {
  const pairs = [[941, 1336], [697, [1209, 1336, 1477][index]]];
  pairs.forEach((frequencies, digit) => {
    const start = audio.currentTime + digit * 0.15;
    for (const frequency of frequencies) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.045, start + 0.012);
      gain.gain.linearRampToValueAtTime(0, start + 0.11);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start);
      oscillator.stop(start + 0.12);
    }
  });
}

export function DialAProof() {
  const [selection, setSelection] = useState(0);
  const [revision, setRevision] = useState(0);
  const [replay, setReplay] = useState<ReturnType<typeof inspectSum> | null>(null);
  const receipt = useRef<HTMLDivElement>(null);
  const audio = useRef<AudioContext | undefined>(undefined);
  const [audible, setAudible] = useState(false);
  useEffect(() => () => { if (audio.current) void audio.current.close().catch(() => {}); }, []);

  function toggleSound() {
    if (audible) { setAudible(false); return; }
    audio.current = startAudio(audio.current);
    if (audio.current) {
      setAudible(true);
      playExtension(audio.current, selection);
    }
  }
  const call = calls[selection];

  useEffect(() => {
    if (!revision || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slip = receipt.current?.animate(
      [{ transform: "translateY(-75%)" }, { transform: "translateY(4%)", offset: 0.8 }, { transform: "translateY(0)" }],
      { duration: 360, easing: "cubic-bezier(.22,.8,.34,1)" },
    );
    return () => slip?.cancel();
  }, [revision]);

  function dial(line: number) {
    if (audible && audio.current) playExtension(audio.current, line);
    setReplay(null);
    setSelection(line);
    setRevision((n) => n + 1);
  }

  return (
    <main className="min-h-svh bg-amber-100 text-stone-950 selection:bg-orange-500">
      <header className="flex min-h-15 items-center justify-between border-b-2 border-stone-950 px-4 sm:px-8 lg:px-12">
        <a href="/" aria-label="Pud home" className={`inline-flex min-h-11 items-center gap-2 text-3xl font-black tracking-tighter ${focus}`}><img src="/pud.svg" width="28" height="28" alt="" />Pud.</a>
        <a href={alphaEntryPath} className={`inline-flex min-h-11 items-center bg-stone-950 px-4 font-mono text-xs font-bold text-amber-100 hover:bg-red-800 ${focus}`}>Join the alpha ↗</a>
      </header>
      <div className="mx-auto grid max-w-screen-2xl border-b-2 border-stone-950 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col justify-between px-4 pt-6 pb-5 sm:px-8 sm:pt-9 lg:px-12 lg:py-9">
          <div>
            <h1 className="font-black tracking-tighter" style={{ fontSize: "clamp(4.3rem, 10.5vw, 10rem)", lineHeight: 0.84 }}>
              Dial-a-<br className="hidden lg:block" /><i className="font-serif tracking-tighter">Proof.</i>
            </h1>
            <p className="mt-4 max-w-xs text-lg leading-tight font-semibold sm:mt-5 sm:text-2xl">Pud checks claims about TypeScript with Lean.</p>
          </div>
          <fieldset className="relative mt-5 min-w-0 border-t-2 border-stone-950 sm:mt-8">
            <legend className="pr-3 font-mono text-xs font-bold uppercase">Dial a recorded result</legend>
            <div className="absolute right-0 -top-8 bg-amber-100 pl-2">
              <button type="button" aria-pressed={audible} onClick={toggleSound} aria-label="Telephone tones"
                className={`inline-flex min-h-11 cursor-pointer items-center font-mono text-xs underline underline-offset-4 ${focus}`}>Sound {audible ? "on" : "off"}</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-md border-2 border-stone-950 bg-stone-950 p-1.5 sm:gap-2 sm:p-2">
              {calls.map((item, index) => (
                <button type="button" key={item.file} aria-pressed={index === selection} aria-controls="hotline-receipt" onClick={() => dial(index)}
                  className={`group flex min-h-14 min-w-0 cursor-pointer flex-col items-start justify-between gap-1 rounded-sm border-b-4 border-amber-400 bg-amber-50 px-2 py-1.5 text-left text-stone-950 hover:bg-amber-200 aria-pressed:translate-y-0.5 aria-pressed:border-orange-700 aria-pressed:bg-orange-400 sm:min-h-18 sm:px-3 lg:min-h-23 motion-safe:transition-transform ${focus} focus-visible:outline-white`}>
                  <span className="font-mono text-xl leading-none font-black tracking-tighter lg:text-4xl">0{index + 1}</span>
                  <span className="text-xs leading-tight font-bold sm:text-sm lg:text-base">{item.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        <section aria-label="Proof hotline operator" className="relative isolate flex min-w-0 flex-col border-t-2 border-stone-950 bg-orange-400 lg:border-t-0 lg:border-l-2">
          <HotlineOperator line={selection} revision={revision} />
          <div className="relative z-10 overflow-hidden border-t-4 border-stone-950 bg-stone-950">
            <div id="hotline-receipt" ref={receipt} aria-live="polite" aria-atomic="true" className="bg-amber-50 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-2 border-b border-dashed border-stone-400 pb-2 font-mono text-xs font-semibold">
                <span>EXT. 0{selection + 1} / {call.file}</span><span className={`px-2 py-1 font-black uppercase ${lights[selection]}`}>{call.status}</span>
              </div>
              <p className="mt-3 max-w-xl text-base leading-tight font-semibold sm:text-lg">{call.description}</p>
              {selection === 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
                  <button type="button" onClick={() => setReplay(inspectSum(1, true))}
                    className={`min-h-11 cursor-pointer bg-stone-950 px-3 font-bold text-amber-100 ${focus}`}>Replay 1n ▶</button>
                  {replay && <output>Returned {replay.actual}n · Expected {replay.expected}n</output>}
                </div>
              )}
              <a href={call.href} className={`inline-flex min-h-11 items-center font-mono text-xs font-bold underline underline-offset-4 ${focus}`}>{call.link} ↗</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
