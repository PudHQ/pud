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

const siteLink = `${pudDisplay.className} group relative isolate flex min-h-12 items-center justify-between gap-4
  px-5 py-3 text-xl leading-none whitespace-nowrap
  before:absolute before:inset-0 before:-z-10 before:-skew-x-9 before:shadow-registration
  focus-visible:outline-2 focus-visible:outline-offset-5 focus-visible:outline-ink
  phone:gap-2 phone:px-3 phone:text-base`;

const siteLinkArrow = "font-sans leading-none motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-ink text-paper">
        <nav className="flex min-h-nav-height flex-wrap items-center justify-between gap-2 small-phone:gap-1" aria-label="Main">
          <a
            className={`${pudWordmark.className} relative isolate flex items-center self-stretch
              ps-gutter pe-wordmark-end pt-2.5 pb-3
              text-wordmark leading-none font-wordmark tracking-wordmark whitespace-nowrap text-wordmark-ink
              font-variation-wordmark
              before:absolute before:inset-0 before:-z-10 before:bg-paper before:clip-wordmark
              focus-visible:outline-2 focus-visible:-outline-offset-5 focus-visible:outline-ink
              phone:pe-6 phone:text-wordmark-phone small-phone:pe-3.75 small-phone:text-xl`}
            href="/"
            aria-label="Pud.dev home"
            aria-current="page"
          >
            <span>Pud<span className="text-wordmark-dot">.</span><span className="text-wordmark-domain">dev</span></span>
          </a>
          <div className="ms-auto flex items-center gap-nav-gap text-nav font-interface phone:gap-3 small-phone:gap-1.5">
            <GitHubStarLink />
            <JoinAlphaLink />
          </div>
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <div className="mx-gutter grid min-h-poster-height flex-1 grid-cols-poster gap-column-gap narrow:portrait:grid-cols-1 narrow:portrait:gap-0">
          <div className="@container self-center py-poster-copy narrow:portrait:py-poster-copy-phone">
            <h1 className={`${pudDisplay.className} text-headline *:block *:w-fit`}>
              <span>The proof-running</span>{" "}
              <span>toolchain for</span>{" "}
              <span className="relative isolate mt-band-top mb-band-bottom pt-band-padding-top pb-band-padding-bottom text-paper
                before:absolute before:inset-y-0 before:-right-band-right before:-left-band-left before:-z-10 before:-skew-x-9 before:bg-ink before:shadow-registration">
                TypeScript
              </span>
            </h1>
            <div className="mt-intro-gap max-w-intro space-y-intro-gap text-intro leading-normal font-medium">
              <p>
                Conventional software testing is changing. Soon, you'll no longer be writing reams of unit tests for your programs: you'll be running proofs against them instead. Pud helps you create, manage, and run your proofs in order to create bug-free code.
              </p>
              <p>
                Pud is under active development and is coming soon. Reach out to pud@rorz.io if you'd like to get involved.
              </p>
            </div>
          </div>
          <div className="relative order-first -ms-gutter bg-vermilion clip-poster
            narrow:portrait:order-last narrow:portrait:-me-gutter narrow:portrait:h-poster-art-phone narrow:portrait:clip-poster-phone">
            <img
              className="absolute top-1/2 left-poster-art-x h-7/10 w-poster-art-width -translate-1/2 object-contain drop-shadow-registration narrow:portrait:top-poster-art-y-phone narrow:portrait:left-1/2"
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
          className="group/alpha grid grid-cols-poster items-center gap-column-gap bg-ink px-gutter py-signup-panel text-paper narrow:grid-cols-1"
        >
          <div>
            <h2 id="alpha-title" className={`${pudDisplay.className} text-signup-title leading-none`}>Join the alpha</h2>
            <p id="alpha-help" className="mt-2.5 text-signup-help group-has-data-[status=joined]/alpha:hidden">
              Leave your email for an invite.
            </p>
          </div>
          <AlphaSignup />
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 bg-paper px-gutter pt-5 pb-4 phone:pb-2">
        <nav aria-label="More from Pud" className="grid grid-cols-2 gap-6 phone:w-full phone:gap-4 small-phone:grid-cols-1">
          <a target="_blank" rel="noopener" className={`${siteLink} text-paper before:bg-blue-950 hover:before:bg-blue-900`} href="https://dex.pud.dev/">
            PudDex
            <span aria-hidden="true" className={`${siteLinkArrow} text-cyan`}>↗</span>
          </a>
          <a target="_blank" rel="noopener" className={`${siteLink} text-ink before:bg-vermilion hover:before:bg-vermilion/85`} href="https://pudlog.substack.com/">
            The Pud Log
            <span aria-hidden="true" className={siteLinkArrow}>↗</span>
          </a>
        </nav>
        <a className="ms-auto inline-flex min-h-12 items-center font-mono text-credit font-semibold text-ink underline underline-offset-3
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink" href="https://rorz.io">by Rory McMeekin</a>
      </footer>
    </div>
  );
}
