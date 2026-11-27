import { display } from "@/app/fonts";
import { PudLogLink } from "@/features/newsstand/pud-log-link";
import { WaitlistSignup } from "@/features/waitlist/signup";

export function UpdatesSection() {
  return (
    <section id="waitlist" aria-labelledby="waitlist-title" className="px-gutter py-12 sm:py-16 xl:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-x-column-gap gap-y-10 md:grid-cols-2 xl:grid-cols-3">
        <div id="alpha" className="group/waitlist min-w-0">
          <h2 id="waitlist-title" className={`${display.className} text-4xl leading-none tracking-tight lg:text-5xl xl:text-6xl`}>
            Join the waitlist
          </h2>
          <p id="waitlist-help" className="mt-3 max-w-sm text-signup-help text-neutral-600 group-has-data-[status=joined]/waitlist:hidden">
            Get an email when the Pud alpha opens.
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
