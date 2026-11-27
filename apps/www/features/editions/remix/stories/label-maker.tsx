"use client";

import { type FormEvent, useState } from "react";
import { decode, encode } from "../../../../../../packages/pud/.examples/zigzag.ts";
import { action, artwork, example, Imprint, sourceLink } from "./imprint";

function emboss(value: bigint) {
  const encoded = encode(value);
  const decoded = decode(encoded);
  return { value: value.toString(), encoded: encoded.toString(), decoded: decoded.toString() };
}

export function LabelMaker() {
  const [field, setField] = useState("-3");
  const [label, setLabel] = useState(() => emboss(BigInt(-3)));
  const [invalid, setInvalid] = useState(false);

  function print(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = field.trim().replace(/^−/, "-");
    if (!/^[+-]?\d{1,32}$/.test(input)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setLabel(emboss(BigInt(input)));
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-24 text-zinc-50 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Imprint title="Label works" />
        <div className="grid gap-y-5 border-b border-zinc-700 pt-6 pb-8 md:grid-cols-12 md:gap-x-8 lg:pt-10">
          <header className="self-center md:col-span-5">
            <h1 className="text-6xl leading-none font-black tracking-tighter sm:text-8xl md:text-5xl lg:text-7xl xl:text-8xl">Signed<span className="text-red-400">/</span><br />Unsigned.</h1>
            <p className="mt-4 max-w-sm text-lg leading-snug text-zinc-200">Feed a signed integer through ZigZag. Print its unsigned label. Read it back to get the original.</p>
            <form onSubmit={print} className="mt-5 max-w-sm">
              <label htmlFor="zigzag-input" className="font-mono text-xs tracking-widest uppercase text-red-300">Signed bigint</label>
              <div className="mt-2 flex items-stretch gap-2">
                <input id="zigzag-input" type="text" spellCheck={false} autoComplete="off" maxLength={33} value={field}
                  aria-invalid={invalid} aria-describedby={invalid ? "zigzag-error" : undefined} onChange={event => { setInvalid(false); setField(event.target.value); }}
                  className="min-h-12 w-1/2 min-w-0 border border-zinc-500 bg-zinc-900 px-3 font-mono text-xl text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300" />
                <button className={`${action} grow bg-red-500 text-black hover:bg-red-400`} type="submit">Print label ↗</button>
              </div>
              {invalid && <p id="zigzag-error" role="alert" className="mt-2 text-sm text-red-300">Enter a signed whole number of up to 32 digits.</p>}
            </form>
          </header>
          <div className="relative min-w-0 md:col-span-7">
            <img src={`${artwork}/embosser.webp`} width={1200} height={800} alt="A red handheld embosser with a curling strip of black label tape" fetchPriority="high"
              className="aspect-3/2 w-full rounded-sm object-cover" />
            <div role="status" aria-atomic="true" className="relative mx-2 -mt-6 rotate-1 border-y-2 border-zinc-500 bg-linear-to-b from-zinc-800 via-black to-zinc-800 p-3 font-mono shadow-lg sm:mx-4 sm:-mt-12 sm:p-4">
              <div className="grid grid-cols-3 divide-x divide-zinc-600">
                {[
                  { title: "Input", text: label.value },
                  { title: "Encoded", text: label.encoded },
                  { title: "Decoded", text: label.decoded },
                ].map(part => (
                  <div key={part.title} className="min-w-0 px-2 sm:px-3">
                    <p className="text-xs text-zinc-300">{part.title}</p>
                    <p className="mt-1 text-2xl font-black tracking-tight break-all text-white text-shadow-md sm:text-3xl">{part.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="grid items-center gap-2 py-4 sm:grid-cols-2">
          <div>
            <p className="font-mono text-sm">decode(encode(value)) === value</p>
            <a href="/editions/remix/places/lemmascript-license.txt" className="inline-flex min-h-11 items-center text-xs text-zinc-300 underline underline-offset-2">Codec source notice</a>
          </div>
          <a href={`${example}/zigzag-roundtrip.proof.ts`} className={`${sourceLink} sm:justify-self-end`}>Pud’s proof for every signed bigint ↗</a>
        </div>
      </div>
    </main>
  );
}
