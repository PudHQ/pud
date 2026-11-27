"use client";

import { useState, type FormEvent } from "react";
import { decode, encode } from "./fixtures";
import { AlphaLink, art, caps, control, example, ProofLink, PudHome } from "./shared";

export function ReturnDesk() {
  const [input, setInput] = useState("-3");
  const [receipt, setReceipt] = useState<{ value: string; coded: string; returned: string } | null>(null);
  const [error, setError] = useState(false);
  function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^-?\d+$/.test(input.trim())) {
      setError(true);
      return;
    }
    const value = BigInt(input.trim());
    const coded = encode(value);
    setReceipt({ value: value.toString(), coded: coded.toString(), returned: decode(coded).toString() });
    setError(false);
  }
  return (
    <main className="bg-emerald-950 text-orange-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-9"><PudHome name="Return Desk" /><AlphaLink /></header>
      <section className="relative isolate min-h-140 overflow-hidden py-7 sm:px-8 sm:py-12 lg:min-h-160">
        <img src={`${art}/return-desk.webp`} alt="A vermilion rubber stamp and brass bell on a green Formica returns counter" width="1440" height="720" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover object-right sm:object-center" />
        <div className="mx-auto max-w-6xl px-4">
          <article className="mx-0 max-w-108 border-t-8 border-red-800 bg-amber-50 px-5 py-5 text-emerald-950 shadow-2xl sm:-rotate-1 sm:px-8 sm:py-7">
            <p className={caps}>Pud / Returns &amp; exchanges</p>
            <h1 className="mt-3 font-serif text-5xl leading-none tracking-tighter sm:text-6xl">Return desk.</h1>
            <p className="mt-3 max-w-76">Send a signed integer through ZigZag. See what comes back.</p>
            <form onSubmit={issue} className="mt-5 border-t border-dashed border-emerald-900 pt-4">
              <label className={caps} htmlFor="return-value">Item to return</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input id="return-value" type="text" autoComplete="off" maxLength={64} spellCheck={false} value={input} onChange={event => { setInput(event.target.value); setReceipt(null); setError(false); }} aria-invalid={error} aria-describedby={error ? "return-error" : undefined} className="min-h-11 w-24 grow border border-emerald-900 bg-white px-2 font-mono text-lg" />
                <button className={`${control} bg-red-800 px-4 text-white hover:bg-red-950`} type="submit">Stamp receipt</button>
              </div>
              {error && <p role="alert" id="return-error" className="mt-2 text-red-800">Enter a signed whole number.</p>}
            </form>
            <div aria-live="polite" className="mt-5 border-y border-dashed border-emerald-900 py-3">
              {receipt ? <>
                <dl className="space-y-1 font-mono text-sm">{[["Sent", receipt.value], ["Encoded", receipt.coded], ["Returned", receipt.returned]].map(([name, value]) => <div className="grid grid-cols-3 gap-2" key={name}><dt>{name}</dt><dd className="col-span-2 break-all text-right">{value}n</dd></div>)}</dl>
                <p className="mt-3 inline-block -rotate-2 border-2 border-red-800 px-2 font-mono text-sm font-black tracking-wide text-red-800 uppercase">Returned intact</p>
              </> : <p className="font-mono text-sm text-emerald-800">Awaiting return.</p>}
            </div>
            <p className="mt-4 text-sm">Pud proves that decoding the encoded value returns the original for every signed bigint.</p>
            <ProofLink href={`${example}/zigzag-roundtrip.proof.ts`} />
          </article>
        </div>
      </section>
    </main>
  );
}
