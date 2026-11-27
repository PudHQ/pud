"use client";

import { useState } from "react";
import { divide } from "../../../../../../packages/pud/.examples/bigint-division.ts";
import { countdownSum } from "../../../../../../packages/pud/.examples/termination.ts";
import { action, artwork, example, Imprint, sourceLink } from "./imprint";

const artNotes = [
  "Pud studies the stack of blocks.",
  "Pud leans into the stack.",
  "Pud shoves the blocks forward.",
  "Pud throws both arms up.",
];
const input = BigInt(3);
const sum = countdownSum(input);
const frames = artNotes.map((art, page) => {
  const remaining = input - BigInt(page);
  const total = sum - countdownSum(remaining);
  const lastAddend = remaining + BigInt(1);
  const expression = page === 0 ? "Start at three." : `${total - lastAddend} + ${lastAddend} = ${total}`;
  return { art, remaining: remaining.toString(), total: total.toString(), expression };
});

export function Flipbook() {
  const [page, setPage] = useState(0);
  const frame = frames[page];
  const lastPage = page === frames.length - 1;
  return (
    <main className="min-h-screen bg-amber-950 px-4 pb-24 text-orange-50 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <Imprint title="Animation department" />
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-amber-200/35 py-5 sm:py-7">
          <h1 className="font-serif text-5xl leading-none tracking-tighter italic text-orange-100 sm:text-7xl">The countdown flipbook.</h1>
          <p className="max-w-60 text-sm leading-snug text-orange-100">Four drawings. Three loop steps. One triangular number.</p>
        </header>
        <section aria-label="Countdown flipbook" className="grid items-center gap-x-10 gap-y-5 py-8 md:grid-cols-12">
          <div className="relative mx-auto w-full max-w-2xl pb-3 md:col-span-8">
            <div aria-hidden="true" className="absolute inset-x-1 top-2 bottom-2 -rotate-1 border border-amber-950/60 bg-orange-200" />
            <div aria-hidden="true" className="absolute inset-x-1.5 top-2.5 bottom-0 rotate-1 border border-amber-950/60 bg-amber-100" />
            <div className="relative border border-amber-950/60 bg-orange-100 px-3.5 pt-2.5 pb-3 text-amber-950 shadow-lg sm:px-5">
              <div aria-hidden="true" className="flex items-center justify-center gap-12 py-1.5 sm:gap-20">
                <span className="h-1.5 w-4 rounded-full bg-amber-950/75" />
                <span className="size-2 rounded-full bg-amber-950/75" />
                <span className="h-1.5 w-4 rounded-full bg-amber-950/75" />
              </div>
              <img width={768} height={512} src={`${artwork}/flip-${page}.webp`} fetchPriority="high" alt={frame.art}
                className="mx-auto block aspect-3/2 max-h-88 w-full object-cover mix-blend-multiply sm:max-h-100" />
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-amber-950/50 pt-2 font-mono text-xs">
                <span>PUD / countdownSum(3n)</span><span>Frame {page + 1} of 4</span>
              </div>
            </div>
          </div>
          <div className="md:col-span-4">
            <div role="status" aria-atomic="true">
              <p className="font-mono text-xs uppercase tracking-widest text-amber-300">At the loop head</p>
              <h2 className="mt-2 font-serif text-3xl leading-none italic sm:text-4xl">{frame.expression}</h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-3 border-y border-amber-100/40 py-2 font-mono text-sm">
                <dt>remaining</dt><dd className="text-right">{frame.remaining}n</dd>
                <dt>total</dt><dd className="text-right">{frame.total}n</dd>
              </dl>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" disabled={page === 0} aria-label="Previous frame" onClick={() => setPage(page - 1)}
                className={`${action} border border-amber-300/70 disabled:cursor-default disabled:opacity-40`}>←</button>
              <button type="button" onClick={() => setPage(lastPage ? 0 : page + 1)}
                className={`${action} bg-amber-200 text-amber-950 hover:bg-amber-100`}>{lastPage ? "Back to frame one" : "Turn page"} <span aria-hidden="true">{lastPage ? "↶" : "→"}</span></button>
            </div>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/35 py-3">
          <p className="max-w-2xl font-serif text-lg leading-snug">For every nonnegative bigint <i>n</i>, Pud proves the loop’s total satisfies <span className="whitespace-nowrap">2 × total = <i>n</i>(<i>n</i> + 1).</span></p>
          <a href={`${example}/countdown-sum.proof.ts`} className={sourceLink}>See the TypeScript proof ↗</a>
        </footer>
      </div>
    </main>
  );
}

const hands = [
  { top: -7, bottom: 3, choices: ["−3", "−2", "2"], reason: "The fractional part is discarded toward zero." },
  { top: 6, bottom: 0, choices: ["0", "Infinity", "RangeError"], reason: "Bigint division by zero throws a RangeError." },
  { top: 8, bottom: -3, choices: ["3", "−3", "−2"], reason: "A negative quotient also truncates toward zero." },
];

function displayInteger(value: number | bigint) {
  return value.toString().replace("-", "−");
}

function dealAnswer(top: number, bottom: number) {
  try {
    return displayInteger(divide(BigInt(top), BigInt(bottom)));
  } catch (error) {
    if (error instanceof RangeError) return error.name;
    throw error;
  }
}

export function Rulebook() {
  const [round, setRound] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const hand = hands[round];
  const won = pick === dealAnswer(hand.top, hand.bottom);
  function deal() {
    setRound((round + 1) % hands.length);
    setPick(null);
  }
  return (
    <main className="min-h-screen bg-emerald-950 px-4 pb-24 text-amber-50 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Imprint title="Table games" />
        <section className="grid items-center gap-7 py-8 md:grid-cols-12 md:gap-10 md:py-12">
          <div className="relative mx-auto w-48 max-w-full sm:w-64 md:col-span-4 md:w-full md:max-w-72">
            <div aria-hidden="true" className="absolute inset-0 -translate-x-1.5 rotate-5 rounded-xl border-4 border-amber-50 bg-rose-800 shadow-xl" />
            <figure className="relative -rotate-3 rounded-xl border-6 border-amber-100 bg-amber-100 text-emerald-950 shadow-xl">
              <img width={620} height={930} fetchPriority="high" src={`${artwork}/division-king.webp`}
                alt="A crowned Pud holding a division scepter, carved in green, gold and red" className="aspect-2/3 w-full rounded-lg" />
              <figcaption className="pt-1.5 pb-0.5 text-center font-serif text-xs font-bold tracking-widest uppercase">King of quotients</figcaption>
            </figure>
          </div>
          <div className="md:col-span-8">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-200">Pud’s book of rules</p>
            <h1 className="mt-2 font-serif text-5xl leading-none tracking-tighter sm:text-7xl lg:text-8xl">The division table.</h1>
            <p className="mt-4 max-w-xl font-serif text-xl leading-snug text-emerald-50">Draw two signed bigints. Play the quotient JavaScript returns, or name the exception.</p>
            <div className="mt-6 border-y border-amber-300/50 py-4">
              <p className="font-mono text-xs uppercase tracking-widest text-amber-200">Hand {round + 1} of {hands.length}</p>
              <h2 className="mt-2 font-serif text-4xl leading-none font-bold tabular-nums sm:text-5xl">{displayInteger(hand.top)} ÷ {displayInteger(hand.bottom)}</h2>
              <fieldset className="mt-3">
                <legend className="sr-only">Choose the result</legend>
                <div className="flex flex-wrap gap-2">
                  {hand.choices.map(choice => <button key={choice} type="button" aria-pressed={pick === choice} onClick={() => setPick(choice)}
                    className={`${action} min-w-15 rounded-sm border border-amber-100 bg-amber-50 font-serif text-lg text-emerald-950 hover:bg-amber-200 aria-pressed:bg-amber-300`}>{choice}</button>)}
                </div>
              </fieldset>
              <div aria-live="polite" className="mt-2">
                {pick && <p className="font-serif text-lg">{won ? `Correct. ${hand.reason}` : "That card misses. Try another."}</p>}
              </div>
              {won && <button type="button" onClick={deal} className={`${action} px-0 text-amber-200 underline underline-offset-4`}>{round === hands.length - 1 ? "Play again" : "Deal next hand"} →</button>}
            </div>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-300/50 py-3">
          <p className="max-w-2xl font-serif text-lg leading-snug">One TypeScript sidecar covers both rules. Pud uses Lean to check every signed bigint numerator and divisor in its model.</p>
          <a href={`${example}/bigint-division.proof.ts`} className={sourceLink}>Read the rules ↗</a>
        </footer>
      </div>
    </main>
  );
}
