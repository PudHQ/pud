import { PudLogLink } from "../newsstand/pud-log-link";
import { WaitlistSignup } from "./signup";

export function WaitlistSection({ displayClass }: { displayClass: string }) {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title"
      className="grid grid-cols-poster items-center gap-x-column-gap gap-y-7 bg-ink px-gutter py-signup-panel text-paper narrow:grid-cols-1">
      <div id="alpha" className="group/waitlist min-w-0">
        <h2 id="waitlist-title" className={`${displayClass} text-4xl leading-none lg:text-5xl xl:text-6xl 2xl:text-7xl`}>
          Join the <span className="text-cyan">waitlist</span>
        </h2>
        <p id="waitlist-help" className="mt-3 max-w-sm text-signup-help text-paper/85 group-has-data-[status=joined]/waitlist:hidden">
          Get notified when the Pud Alpha is ready to try.
        </p>
        <WaitlistSignup />
      </div>
      <PudLogLink displayClass={displayClass} />
    </section>
  );
}
