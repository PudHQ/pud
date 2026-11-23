import { DexTerminal } from "./terminal";

const dex = import.meta.env.DEV ? "http://localhost:4902/" : "https://dex.pud.dev/";

export function DexSection() {
  return (
    <section id="puddex" aria-labelledby="puddex-title" className="relative isolate bg-black text-paper">
      <h2 id="puddex-title" className="sr-only">PudDex</h2>
      <DexTerminal url={dex} />
    </section>
  );
}
