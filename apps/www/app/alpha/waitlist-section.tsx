import { PudLogLink } from "../newsstand/pud-log-link";
import { WaitlistSignup } from "./signup";

export function WaitlistSection({ displayClass }: { displayClass: string }) {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="bg-ink px-gutter py-9 text-paper sm:py-12 xl:py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-poster items-center gap-x-column-gap gap-y-8 narrow:grid-cols-1 xl:grid-cols-3">
        <div id="alpha" className="group/waitlist min-w-0">
          <h2 id="waitlist-title" className={`${displayClass} text-5xl leading-none sm:text-6xl xl:text-7xl`}>
            Join the <span className="block text-cyan narrow:inline">waitlist</span>
          </h2>
          <p id="waitlist-help" className="mt-4 max-w-sm text-signup-help text-pretty text-paper/85 group-has-data-[status=joined]/waitlist:hidden">
            Get notified when the Pud Alpha is ready to try.
          </p>
          <WaitlistSignup />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <PudLogLink />
        </div>
      </div>
    </section>
  );
}
