"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  editions,
  editionPath,
  featuredRemix,
  firstRound,
  secondRound,
  thirdRound,
  type Edition,
} from "./catalog";

const storageKey = "pud.editions.shortlist.v1";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4";

function BookmarkButton({
  edition,
  active,
  onToggle,
  className,
}: {
  edition: Edition;
  active: boolean;
  onToggle: (edition: Edition) => void;
  className: string;
}) {
  return (
    <button
      type="button"
      title={active ? "Remove from shortlist" : "Add to shortlist"}
      aria-label={`Shortlist ${edition.title}`}
      aria-pressed={active}
      onClick={() => onToggle(edition)}
      className={`absolute grid size-11 cursor-pointer place-items-center rounded-full border hover:bg-amber-200 hover:text-ink aria-pressed:bg-amber-200 aria-pressed:text-ink ${focus} ${className}`}
    >
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} className="size-5" aria-hidden="true">
        <path
          d="M6.5 4.5h11v15l-5.5-3.7-5.5 3.7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function MotionPreview({
  edition,
  eager,
  featured = false,
  children,
}: {
  edition: Edition;
  eager: boolean;
  featured?: boolean;
  children: ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const base = `/editions/previews/${edition.slug}`;

  function play() {
    const player = video.current;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (
      !player?.paused ||
      connection?.saveData ||
      window.matchMedia("(prefers-reduced-motion: reduce), (prefers-reduced-data: reduce)").matches
    )
      return;
    if (!player.src) player.src = `${base}.webm`;
    player.currentTime = 0;
    void player.play().catch(() => setPlaying(false));
  }

  function stop() {
    video.current?.pause();
    setPlaying(false);
  }

  return (
    <a
      href={editionPath(edition.slug)}
      aria-label={`Open ${edition.title}`}
      className={`group ${featured ? "grid sm:grid-cols-2" : "block"} ${focus}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") play();
      }}
      onPointerLeave={(event) => {
        if (!event.currentTarget.matches(":focus-visible")) stop();
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) play();
      }}
      onBlur={stop}
    >
      <div className="relative overflow-hidden bg-stone-50" inert>
        <img
          src={`${base}.webp`}
          alt=""
          width="960"
          height="600"
          loading={eager ? "eager" : "lazy"}
          className={
            featured
              ? "block aspect-2/1 w-full object-contain sm:h-full sm:max-h-64"
              : "block aspect-8/5 w-full object-cover object-top"
          }
        />
        <video
          ref={video}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
          onEnded={stop}
          onError={stop}
          className={`pointer-events-none absolute inset-0 size-full object-contain ${playing ? "opacity-100" : "opacity-0"}`}
        />
      </div>
      {children}
    </a>
  );
}

function FeaturedRemix({ saved, onToggle }: { saved: boolean; onToggle: (edition: Edition) => void }) {
  return (
    <article className="relative mb-8 border border-ink bg-paper text-ink">
      <MotionPreview edition={featuredRemix} eager featured>
        <div className="flex flex-col items-start justify-center gap-2 px-5 py-5 pr-14 sm:px-7 sm:py-7 lg:px-10">
          <p className="font-mono text-xs font-semibold text-blue-800">Night Shift / The triangular sum</p>
          <h2 className="text-4xl leading-none font-black tracking-tighter sm:text-5xl lg:text-6xl">
            {featuredRemix.title}
          </h2>
          <span className="mt-1 text-sm font-semibold underline underline-offset-4">Open the remix →</span>
        </div>
      </MotionPreview>
      <BookmarkButton
        edition={featuredRemix}
        active={saved}
        onToggle={onToggle}
        className="right-2 bottom-2 border-stone-500 sm:right-4 sm:bottom-4"
      />
    </article>
  );
}

export function EditionGallery({ round }: { round: 1 | 2 | 3 }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState(false);

  const shortlistFilter = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(stored))
        setSaved(editions.filter((item) => stored.includes(item.slug)).map((item) => item.slug));
    } catch {
      /* The gallery also works without storage. */
    }
  }, []);

  function toggle(edition: Edition) {
    if (shortlist) shortlistFilter.current?.focus({ preventScroll: true });
    const next = saved.includes(edition.slug)
      ? saved.filter((slug) => slug !== edition.slug)
      : [...saved, edition.slug];
    setSaved(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Keep the current session's selection. */
    }
  }

  const visible = shortlist
    ? editions.filter((item) => saved.includes(item.slug))
    : round === 1
      ? firstRound
      : round === 2
        ? secondRound
        : thirdRound;
  const tab = `inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold hover:underline sm:px-4 ${focus}`;
  return (
    <main className="min-h-screen bg-stone-100 text-ink">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-8 lg:px-12">
        <header className="flex min-h-16 items-center justify-between border-b border-ink sm:min-h-20">
          <a
            href="/"
            className={`flex min-h-11 items-center gap-2 text-3xl font-black tracking-tighter ${focus}`}
            aria-label="Pud home"
          >
            <img src="/pud.svg" alt="" className="h-9 w-9 object-contain" width="36" height="36" />
            Pud.
          </a>
          <a href="/" className={`inline-flex min-h-11 items-center font-mono text-xs hover:underline ${focus}`}>
            pud.dev ↗
          </a>
        </header>
        <section
          aria-labelledby="gallery-title"
          className="grid items-end gap-y-5 py-7 sm:py-10 lg:grid-cols-3 lg:py-12"
        >
          <h1
            id="gallery-title"
            className="font-sans text-6xl leading-none font-black tracking-tighter sm:text-8xl lg:col-span-2 xl:text-9xl"
          >
            Pud <em className="font-serif font-normal">Editions.</em>
          </h1>
          <p className="max-w-xs text-lg leading-tight lg:justify-self-end lg:pb-2">
            {round === 1
              ? "Ten early studies for Pud’s landing page."
              : round === 2
                ? "Twenty-five ways to get your hands on a TypeScript proof."
                : "Ten playable front pages for Pud. Pick one up."}
          </p>
        </section>
        <nav
          aria-label="Edition collections"
          className="mb-5 flex flex-wrap items-center gap-1 border-y border-ink/35 py-2 font-mono text-xs sm:mb-7"
        >
          <a
            href="/editions"
            aria-current={round === 3 && !shortlist ? "page" : undefined}
            className={`${tab} aria-[current=page]:bg-ink aria-[current=page]:text-white`}
          >
            Round 03 <span>{thirdRound.length}</span>
          </a>
          <a
            href="/editions?round=2"
            aria-current={round === 2 && !shortlist ? "page" : undefined}
            className={`${tab} aria-[current=page]:bg-ink aria-[current=page]:text-white`}
          >
            Round 02 <span>{secondRound.length}</span>
          </a>
          <a
            href="/editions?round=1"
            aria-current={round === 1 && !shortlist ? "page" : undefined}
            className={`${tab} aria-[current=page]:bg-ink aria-[current=page]:text-white`}
          >
            Round 01 <span>{firstRound.length}</span>
          </a>
          <button
            ref={shortlistFilter}
            type="button"
            aria-pressed={shortlist}
            onClick={() => setShortlist(!shortlist)}
            className={`${tab} cursor-pointer aria-pressed:bg-ink aria-pressed:text-white`}
          >
            Shortlist <span>{saved.length}</span>
          </button>
        </nav>
        {!shortlist && round === 2 && (
          <FeaturedRemix saved={saved.includes(featuredRemix.slug)} onToggle={toggle} />
        )}
        <div className="grid gap-x-5 gap-y-8 pb-12 sm:grid-cols-2 lg:gap-x-6 xl:grid-cols-3 xl:gap-y-10">
          {visible.map((edition, index) => {
            const label = (
              <>
                <div className="mt-3 flex items-baseline gap-3 pr-12">
                  <span className="font-mono text-xs text-stone-600">{String(index + 1).padStart(2, "0")}</span>
                  <h2 className="text-2xl leading-none font-bold tracking-tight group-hover:underline sm:text-3xl">
                    {edition.title}
                  </h2>
                </div>
                <p className="mt-2 pr-12 text-sm leading-snug text-stone-700">{edition.description}</p>
              </>
            );
            const moving = thirdRound.some((item) => item.slug === edition.slug);
            return (
              <article key={edition.slug} className="relative min-w-0">
                {moving ? (
                  <MotionPreview edition={edition} eager={index < 3}>
                    {label}
                  </MotionPreview>
                ) : (
                  <a
                    href={editionPath(edition.slug)}
                    aria-label={`Open ${edition.title}`}
                    className={`group block rounded-sm ${focus}`}
                  >
                    <div className="overflow-hidden border border-ink/20 bg-paper">
                      <img
                        src={`/editions/previews/${edition.slug}.webp`}
                        alt=""
                        width="960"
                        height="600"
                        loading={index < 3 ? "eager" : "lazy"}
                        className="block aspect-8/5 w-full object-cover object-top motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-102"
                      />
                    </div>
                    {label}
                  </a>
                )}
                <BookmarkButton
                  edition={edition}
                  active={saved.includes(edition.slug)}
                  onToggle={toggle}
                  className="right-0 bottom-0 border-stone-400"
                />
              </article>
            );
          })}
        </div>
        {shortlist && !saved.length && (
          <p className="max-w-md pb-14 text-lg">
            Your shortlist is empty. Use the bookmark beside an edition to save it here.
          </p>
        )}
      </div>
    </main>
  );
}
