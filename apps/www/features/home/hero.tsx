import { display } from "@/app/fonts";
import { dexOrigin } from "@/lib/links";

const proofGuide = `${dexOrigin}/notes/handbook/engineering/verification/lean/checking-typescript-with-lean/#run-the-search-proof`;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-gutter my-gutter overflow-hidden rounded-3xl bg-paper md:rounded-4xl">
      <div className="mx-auto grid max-w-384 items-center sm:grid-cols-2">
        <div className="@container min-w-0 px-6 pt-8 sm:py-12 sm:pe-0 sm:ps-9 lg:py-16 lg:ps-16 xl:py-20">
          <p className="mb-4 flex items-center gap-2.5 font-mono text-xs font-semibold tracking-widest text-neutral-700 uppercase
            before:h-0.5 before:w-6 before:bg-vermilion sm:mb-5">
            TypeScript proof runner
          </p>
          <h1 id="hero-title" className={`${display.className} text-headline`}>
            The proof is <span className="block">in the Pud<span className="text-vermilion">.</span></span>
          </h1>
          <p className="mt-5 max-w-intro text-base leading-relaxed text-neutral-700 lg:mt-6 lg:text-lg">
            Write a property in TypeScript. Pud checks it with Lean for every input you specify.
          </p>
          <a href={proofGuide} target="_blank" rel="noopener"
            className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold underline decoration-ink/40
              decoration-1 underline-offset-5 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-3 lg:mt-6">
            Read a working proof <span aria-hidden="true" className="motion-safe:transition-transform group-hover:translate-x-0.5">↗</span>
          </a>
        </div>
        <img src="/pud-proof-reader.webp" alt="Pud inspecting a ribbon of punched tape at a teal computer."
          width="1200" height="800" fetchPriority="high"
          className="mx-auto w-full max-w-2xl px-3 pb-4 mix-blend-multiply sm:p-4 lg:p-6" />
      </div>
    </section>
  );
}
