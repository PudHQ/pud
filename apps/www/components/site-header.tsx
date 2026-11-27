import { wordmark } from "@/app/fonts";
import { GitHubStarLink } from "@/features/github-star/star-link";
import { JoinWaitlistLink } from "@/features/waitlist/join-link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 isolate before:pointer-events-none before:absolute before:inset-0 before:-z-10
      before:border-b before:border-black/5 before:bg-white/90 before:backdrop-blur-md">
      <nav aria-label="Main" className="flex min-h-nav-height flex-wrap items-center justify-between gap-1 px-gutter sm:gap-2">
        <a href="/" aria-label="Pud.dev home" aria-current="page"
          className={`${wordmark.className} inline-flex min-h-11 items-center rounded-sm text-wordmark leading-none
            font-wordmark tracking-wordmark whitespace-nowrap text-wordmark-ink font-variation-wordmark
            focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink small-phone:text-lg`}>
          <span>Pud<span className="text-wordmark-dot">.</span><span className="text-wordmark-domain">dev</span></span>
        </a>
        <div className="ms-auto flex items-center gap-1.5 sm:gap-3">
          <GitHubStarLink />
          <JoinWaitlistLink />
        </div>
      </nav>
    </header>
  );
}
