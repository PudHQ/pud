"use client";

import { useState } from "react";
import { bookingPrice, canReserve } from "./fixtures";
import { AlphaLink, art, caps, control, ProofLink, PudHome, source } from "./shared";

const capacity = 8;
const price = BigInt(111);
const seats = Array.from({ length: capacity }, (_, index) => index + 1);
const seatProof = `${source}/experiments/booking-verification/.proofs/seat-availability.proof.ts`;

export function LastSeat() {
  const [requested, setRequested] = useState(3);
  const available = canReserve(BigInt(capacity), BigInt(requested));
  const charge = bookingPrice(price * BigInt(requested), true);
  return (
    <main className="min-h-screen bg-orange-100 text-violet-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b-2 border-violet-950 px-4 py-1 sm:px-8"><PudHome name="Last Seat" /><AlphaLink /></header>
      <div className="mx-auto grid max-w-7xl border-b-2 border-violet-950 sm:grid-cols-12">
        <figure className="relative isolate min-w-0 overflow-hidden border-b-2 border-violet-950 bg-orange-400 sm:col-span-6 sm:border-r-2 sm:border-b-0 lg:col-span-7">
          <img src={`${art}/last-seat.webp`} alt="Orange and aubergine linocut of a hand lifting a fresh Pud print from the woodblock" width="960" height="1200" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
          <div className="flex h-72 items-end sm:h-full sm:min-h-138 sm:items-start">
            <h1 className="bg-violet-950 px-4 py-3 font-serif text-5xl leading-none font-bold tracking-tighter text-orange-50 sm:m-6 sm:text-6xl lg:text-7xl">The last seat.</h1>
          </div>
        </figure>
        <section aria-labelledby="booking-title" className="min-w-0 px-5 py-7 sm:col-span-6 sm:px-7 lg:col-span-5 lg:py-10">
          <p className={`${caps} text-orange-900`}>Pud / Booking experiment</p>
          <h2 id="booking-title" className="mt-3 font-serif text-4xl leading-none tracking-tight sm:text-5xl">Printmaking<br /><em>workshop.</em></h2>
          <p className="mt-4 max-w-sm leading-snug">Alice is a member. The workshop has eight seats at 111¢ each. How many can she take?</p>
          <fieldset className="mt-6 border-y border-violet-950 py-3">
            <legend className={`${caps} pr-2`}>Seats requested</legend>
            <div className="flex items-center justify-between gap-3">
              <button type="button" aria-label="Request one fewer seat" disabled={requested === 0} onClick={() => setRequested(requested - 1)} className={`${control} size-12 rounded-full border-2 border-violet-950 text-2xl hover:bg-orange-200 disabled:opacity-35`}>−</button>
              <span className="font-serif text-6xl font-bold tabular-nums">{requested}</span>
              <button type="button" aria-label="Request one more seat" disabled={requested === capacity + 1} onClick={() => setRequested(requested + 1)} className={`${control} size-12 rounded-full border-2 border-violet-950 text-2xl hover:bg-orange-200 disabled:opacity-35`}>+</button>
            </div>
            <div aria-hidden="true" className="mt-3 grid grid-cols-8 gap-1">{seats.map(seat => <span key={seat} className={`block h-4 rounded-t-md border border-violet-950 ${seat <= requested ? "bg-violet-950" : "bg-transparent"}`} />)}</div>
          </fieldset>
          <div aria-live="polite" className="mt-3">
            <strong className="font-serif text-2xl">{available ? `Member ticket · ${charge}¢` : "Booking declined."}</strong>
            <p className="mt-1 text-sm">{available ? `${capacity - requested} seats would remain. Members pay 90%, rounded up to a whole cent.` : requested === 0 ? "A booking needs at least one seat." : "Nine requested. Only eight are available."}</p>
          </div>
          <div className="mt-6 border-t border-violet-950 pt-3"><p className="text-sm">Pud checks the acceptance rule for any nonnegative stock and any signed request.</p><ProofLink href={seatProof}>Inspect the seat rule</ProofLink></div>
        </section>
      </div>
    </main>
  );
}
