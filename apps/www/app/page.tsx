import localFont from "next/font/local";
import { AlphaSignup, JoinAlphaLink } from "./alpha/signup";

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
    <div className="splash">
      <header className="masthead">
        <nav className="header-nav" aria-label="Main">
          <a
            className={`wordmark ${pudWordmark.className}`}
            href="/"
            aria-label="Pud.dev home"
            aria-current="page"
          >
            <span>Pud<span className="dot">.</span><span className="domain">dev</span></span>
          </a>
          <div className="nav-actions">
            <button className="about-tab" type="button" popoverTarget="about-pud" aria-label="About Pud">
              About<span className="tab-symbol" aria-hidden="true" />
            </button>
            <JoinAlphaLink />
          </div>
        </nav>
        <div id="about-pud" className="project-note" popover="auto" role="region" aria-label="About Pud">
          <p>Pud is a true next-generation tool for running proofs against your TypeScript programs in order to make them bug-free.</p>
        </div>
      </header>
      <main className="poster">
        <div className="composition">
          <div className="statement">
            <h1 className={`tagline ${pudDisplay.className}`}>
              <span>The proof-running</span>{" "}
              <span>toolchain for</span>{" "}
              <span className="knockout">TypeScript</span>
            </h1>
            <p className="intro">
              Conventional software testing is changing. Soon, you'll no longer be writing reams of unit tests for your programs: you'll be running proofs against them instead. Pud helps you create, manage, and run your proofs in order to create bug-free code.
            </p>
            <p className="intro">
        Pud is under active development and is coming soon. Reach out to pud@rorz.io if you'd like to get involved.
            </p>

          </div>
          <div className="print">
            <img
              src="/pud.svg"
              alt="Pud, a caramel pudding with round glasses and a pink bow tie"
              width="1348"
              height="1372"
            />
          </div>
        </div>
        <section id="alpha" className="alpha-section" aria-labelledby="alpha-title">
          <div className="alpha-heading">
            <h2 id="alpha-title" className={pudDisplay.className}>Join the alpha</h2>
            <p id="alpha-help">Leave your email for an invite.</p>
          </div>
          <AlphaSignup />
        </section>
      </main>
      <footer className="imprint">
        <a className="credit" href="https://rorz.io">by Rory McMeekin</a>
      </footer>
    </div>
  );
}
