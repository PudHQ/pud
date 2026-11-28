"use client";

import { useState } from "react";
import { isSorted } from "./fixtures";
import { AlphaLink, art, caps, control, example, ProofLink, PudHome } from "./shared";

const trays = [[2, 7, 3, 8], [6, 1, 1, 4], [9, 2, 5, 3]];

export function MailRoom() {
  const [tray, setTray] = useState(0);
  const [parcels, setParcels] = useState(trays[0]);
  const ready = isSorted(parcels.map(value => BigInt(value)));
  const inversion = parcels.findIndex((value, index) => index > 0 && value < parcels[index - 1]);
  function swap(first: number) {
    setParcels(current => {
      const next = [...current];
      [next[first], next[first + 1]] = [next[first + 1], next[first]];
      return next;
    });
  }
  function nextTray() {
    const next = (tray + 1) % trays.length;
    setTray(next);
    setParcels(trays[next]);
  }
  return (
    <main className="min-h-screen bg-sky-50 px-3 pt-3 pb-10 text-blue-950 sm:px-6">
      <div className="mx-auto max-w-6xl border-2 border-blue-950 bg-orange-50 shadow-lg">
        <header className="flex items-center justify-between border-b-2 border-blue-950 px-4 sm:px-7"><PudHome name="Mail Room" /><AlphaLink /></header>
        <div className="grid items-stretch sm:grid-cols-2">
          <div className="flex flex-col justify-center px-5 pt-6 pb-5 sm:px-8 sm:py-9 lg:px-12">
            <p className={`${caps} text-red-800`}>Pud / Parcel post</p>
            <h1 className="mt-2 font-serif text-6xl leading-none font-black tracking-tighter sm:text-7xl lg:text-8xl">Mail <em>Room</em></h1>
            <p className="mt-3 max-w-70 text-lg leading-snug">The birds take one tray at a time. Put the parcel numbers in order before dispatch.</p>
          </div>
          <img src={`${art}/mail-room.webp`} alt="A blue carrier pigeon flying over a coastal post office with a bundle of sealed envelopes" width="1440" height="720" fetchPriority="high" className="h-44 w-full border-t-2 border-blue-950 object-cover object-right sm:h-full sm:min-h-60 sm:border-t-0 sm:border-l-2" />
        </div>
        <section aria-labelledby="sorting-tray" className="border-t-4 border-double border-blue-950 px-4 py-5 sm:px-7 lg:px-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <h2 id="sorting-tray" className="font-serif text-3xl font-semibold sm:text-4xl">The sorting tray</h2>
            <button type="button" onClick={nextTray} className={`${control} px-1 font-mono text-sm underline`}>Load next tray ↻</button>
          </div>
          <p className="mb-3 text-sm">Swap a neighboring pair.</p>
          <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
            {parcels.map((value, index) => <li key={`slot-${index}`} className="relative flex h-20 items-center justify-center border-2 border-blue-950 bg-amber-200 font-serif text-4xl font-bold shadow-sm sm:h-24 sm:text-5xl">
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-blue-950/20" />
              <span className="relative border border-blue-950/40 bg-orange-50 px-2">{value}</span>
            </li>)}
          </ol>
          <div className="mx-auto grid w-3/4 grid-cols-3 gap-1 sm:gap-3">
            {[0, 1, 2].map(index => <button key={index} aria-label={`Swap parcels ${index + 1} and ${index + 2}`} onClick={() => swap(index)} type="button" className={`${control} border-b-2 border-blue-950 px-1 text-xl hover:bg-amber-100`}>⇄</button>)}
          </div>
          <p role="status" className={`mt-4 border-l-4 pl-3 font-mono text-sm font-bold ${ready ? "border-emerald-700 text-emerald-800" : "border-red-700 text-red-800"}`}>{ready ? "Ready for dispatch. All parcels are in order." : `Tray held. ${parcels[inversion - 1]} comes before ${parcels[inversion]}.`}</p>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-x-5 border-t border-blue-950 px-4 py-3 sm:px-7 lg:px-12">
          <p className="max-w-lg text-sm">Pud proves that <code>isSorted</code> returns true exactly when each bigint is at least as large as the one before it.</p>
          <ProofLink href={`${example}/is-sorted.proof.ts`} />
        </div>
      </div>
    </main>
  );
}
