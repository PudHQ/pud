import { dexOrigin, pudDexUrl } from "@/lib/links";
import { DexTerminal } from "./terminal/terminal";

export function DexSection() {
  return (
    <section id="puddex" aria-labelledby="puddex-title" className="bg-black text-white">
      <div className="relative isolate overflow-hidden px-gutter py-14 text-center sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-center opacity-70 mask-b-from-75%"
          style={{ backgroundImage: `url(${dexOrigin}/stars.svg)` }} />
        <p className="font-mono text-xs tracking-widest text-neutral-300 sm:text-sm">The factory is quiet. One terminal is still on.</p>
        <h2 id="puddex-title" className="mt-4 font-pixel text-6xl leading-none font-medium tracking-widest uppercase
          text-shadow-lg text-shadow-white/35 sm:text-8xl lg:text-9xl">PudDex</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-300 sm:text-base">
          The handbook, experiments, and captain’s logs live on the machine below.
        </p>
        <a href={pudDexUrl} target="_blank" rel="noopener"
          className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-sm font-mono text-xs text-white underline decoration-white/40
            underline-offset-5 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2">
          Open the archive <span aria-hidden="true">↗</span>
        </a>
      </div>
      <DexTerminal iframeUrl={dexOrigin} address={pudDexUrl} />
    </section>
  );
}
