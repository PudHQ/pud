import { DexTerminal } from "./terminal";

export const pudDexUrl = "https://dex.pud.dev";
const iframeUrl = import.meta.env.DEV ? "http://localhost:4902/" : pudDexUrl;

export function DexSection() {
  return (
    <section id="puddex" aria-labelledby="puddex-title" className="relative isolate bg-black text-paper">
      <h2 id="puddex-title" className="sr-only">PudDex</h2>
      <DexTerminal iframeUrl={iframeUrl} address={pudDexUrl} />
    </section>
  );
}
