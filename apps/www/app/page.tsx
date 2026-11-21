import localFont from "next/font/local";
import { AlphaSignup, JoinAlphaLink } from "./alpha/signup";
import { GitHubStarLink } from "./github-star-link";

// Google Sans Flex 4.007 retains the grade axis used in the original wordmark.
const pudWordmark = localFont({
  src: "./fonts/google-sans-flex-4.007-wordmark.woff2",
  weight: "1 1000",
  display: "swap",
});

const pudDisplay = localFont({
  src: "./fonts/google-sans-flex-4.007-display.woff2",
  weight: "865",
  display: "swap",
});

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-ink text-paper">
        <nav className="flex min-h-[clamp(4rem,6.8vw,6rem)] flex-wrap items-center justify-between gap-2 small-phone:gap-1" aria-label="Main">
          <a
            className={`${pudWordmark.className} relative isolate flex items-center self-stretch
              ps-gutter pe-[clamp(1.6rem,4.4vw,5rem)] pt-[0.65rem] pb-3
              text-[clamp(1.7rem,1.1rem_+_2.9vw,3.625rem)] leading-none font-[758] tracking-[0.012em] whitespace-nowrap text-[#340800]
              [font-variation-settings:'opsz'_144,'slnt'_0,'wdth'_120,'GRAD'_66,'ROND'_65]
              before:absolute before:inset-0 before:-z-10 before:bg-paper before:[clip-path:polygon(0_0,100%_0,calc(100%_-_1.15rem)_100%,0_100%)]
              focus-visible:outline-2 focus-visible:-outline-offset-5 focus-visible:outline-ink
              phone:pe-6 phone:text-[clamp(1.3rem,5.5vw,1.7rem)] small-phone:pe-[0.95rem] small-phone:text-xl`}
            href="/"
            aria-label="Pud.dev home"
            aria-current="page"
          >
            <span>Pud<span className="text-[#ff1641]">.</span><span className="text-[#881d00]">dev</span></span>
          </a>
          <div className="ms-auto flex items-center gap-[clamp(1rem,3vw,3rem)] text-[clamp(0.85rem,1.1vw,1.05rem)] leading-[1.2] font-[650] phone:gap-3 small-phone:gap-1.5">
            <GitHubStarLink />
            <JoinAlphaLink />
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <div className="mx-gutter grid min-h-[clamp(22rem,54svh,48rem)] flex-1 grid-cols-poster gap-column-gap narrow:portrait:grid-cols-1 narrow:portrait:gap-0">
          <div className="@container self-center py-[clamp(2rem,4vw,4.5rem)] narrow:portrait:py-[clamp(1.5rem,5.5svh,3.5rem)]">
            <h1 className={`${pudDisplay.className} text-[min(12.1cqi,8.25rem)] leading-[0.98] *:block *:w-fit`}>
              <span>The proof-running</span>{" "}
              <span>toolchain for</span>{" "}
              <span className="relative isolate mt-[0.16em] mb-[0.08em] pt-[0.04em] pb-[0.11em] text-paper
                before:absolute before:inset-y-0 before:-right-[0.23em] before:-left-[0.22em] before:-z-10 before:-skew-x-9 before:bg-ink before:shadow-registration">
                TypeScript
              </span>
            </h1>
            <div className="mt-intro-gap max-w-[43ch] space-y-intro-gap text-[clamp(1.3rem,1.48vw,1.48rem)] leading-normal font-medium">
              <p>
                Conventional software testing is changing. Soon, you'll no longer be writing reams of unit tests for your programs: you'll be running proofs against them instead. Pud helps you create, manage, and run your proofs in order to create bug-free code.
              </p>
              <p>
                Pud is under active development and is coming soon. Reach out to pud@rorz.io if you'd like to get involved.
              </p>
            </div>
          </div>
          <div className="relative order-first -ms-gutter bg-vermilion [clip-path:polygon(0_0,100%_0,86%_100%,0_100%)]
            narrow:portrait:order-last narrow:portrait:-me-gutter narrow:portrait:h-[clamp(12rem,59vw,23rem)] narrow:portrait:[clip-path:polygon(0_12%,100%_0,100%_100%,0_100%)]">
            <img
              className="absolute top-1/2 left-[46%] h-[70%] w-[min(62%,22rem)] -translate-1/2 object-contain drop-shadow-registration narrow:portrait:top-[54%] narrow:portrait:left-1/2"
              src="/pud.svg"
              alt="Pud, a caramel pudding with round glasses and a pink bow tie"
              width="1348"
              height="1372"
            />
          </div>
        </div>
        <section
          id="alpha"
          aria-labelledby="alpha-title"
          className="group/alpha grid grid-cols-poster items-center gap-column-gap bg-ink px-gutter py-[clamp(1.75rem,3.2vw,3.5rem)] text-paper narrow:grid-cols-1"
        >
          <div>
            <h2 id="alpha-title" className={`${pudDisplay.className} text-[clamp(2.1rem,3.7vw,4rem)] leading-none`}>Join the alpha</h2>
            <p id="alpha-help" className="mt-[0.6rem] text-[0.98rem] leading-[1.45] group-has-data-[status=joined]/alpha:hidden">
              Leave your email for an invite.
            </p>
          </div>
          <AlphaSignup />
        </section>
      </main>
      <footer className="flex items-center justify-end bg-paper px-gutter">
        <a className="inline-flex min-h-12 items-center font-mono text-[0.78rem] leading-[1.3] font-semibold text-ink underline underline-offset-3
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" href="https://rorz.io">by Rory McMeekin</a>
      </footer>
    </div>
  );
}
