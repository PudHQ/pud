import { display } from "@/app/fonts";
import { dexOrigin } from "@/lib/links";

const proofGuide = `${dexOrigin}/notes/handbook/engineering/verification/lean/checking-typescript-with-lean/#run-the-search-proof`;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mx-gutter mt-gutter rounded-3xl bg-paper md:rounded-4xl">
      <div className="mx-auto grid max-w-6xl items-center gap-y-6 px-6 py-9 sm:px-10 sm:py-12 md:grid-cols-12 md:gap-x-8 lg:py-16">
        <img src="/pud.svg" alt="Pud, a caramel pudding with glasses and a bow tie"
          width="1348" height="1372" fetchPriority="high"
          className="w-24 justify-self-center sm:w-32 md:col-span-5 md:w-4/5 md:max-w-72 lg:max-w-80" />
        <div className="@container min-w-0 md:col-span-7">
          <h1 id="hero-title" className={`${display.className} text-headline tracking-tight`}>
            Mathematicians have proofs.{" "}
            <span className="block text-wordmark-domain">Why don’t devs?</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-neutral-700 lg:mt-6 lg:text-lg">
            Tests tell you what happened on the inputs you tried. With Pud, you can state a rule in TypeScript and prove it for every input the rule covers.
          </p>
          <a href={proofGuide} target="_blank" rel="noopener"
            className="group mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold underline decoration-ink/35
              underline-offset-5 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-3">
            Read the linear search proof <span aria-hidden="true" className="motion-safe:transition-transform group-hover:translate-x-0.5">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
