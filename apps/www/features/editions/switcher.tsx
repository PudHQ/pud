import { type RoundEdition, editionPath, featuredRemix, roundFor, roundPath, rounds } from "./catalog";

const arrow = "grid min-h-11 min-w-11 place-items-center rounded-full text-lg hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white";

export function EditionSwitcher({ edition }: { edition: RoundEdition }) {
  const number = roundFor(edition.slug);
  const current = number >= 3;
  const round = rounds[number];
  const index = round.findIndex(item => item.slug === edition.slug);
  const prev = round[(index + round.length - 1) % round.length];
  const next = round[(index + 1) % round.length];
  return (
    <nav data-edition-switcher aria-label="Browse landing editions" className={current ? "flex w-full items-center justify-center gap-1 bg-ink p-1 font-mono text-xs text-white" : "fixed inset-x-0 bottom-3 z-50 mx-auto flex w-fit items-center gap-0.5 rounded-full border border-white/30 bg-ink p-1 font-mono text-xs text-white shadow-xl"}>
      <a href={roundPath(number)} className="flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"><span aria-hidden="true">▦</span> Editions</a>
      {(edition.slug === "crash-test" || edition.slug === "night-shift") && (
        <a href={editionPath(featuredRemix.slug)} aria-label={`Open the remix, ${featuredRemix.title}`} className="inline-flex min-h-11 items-center rounded-full px-2 font-bold text-amber-200 hover:underline focus-visible:outline-2 focus-visible:outline-white sm:px-3">
          <span className="sm:hidden">Remix ↗</span><span className="hidden sm:inline">{featuredRemix.title} ↗</span>
        </a>
      )}
      <span className="border-x border-white/25 px-3 text-stone-300"><span className="sr-only">Edition </span>{String(index + 1).padStart(2, "0")} / {round.length}</span>
      <a href={editionPath(prev.slug)} aria-label={`Previous edition, ${prev.title}`} className={arrow}>←</a>
      <a href={editionPath(next.slug)} aria-label={`Next edition, ${next.title}`} className={arrow}>→</a>
    </nav>
  );
}
