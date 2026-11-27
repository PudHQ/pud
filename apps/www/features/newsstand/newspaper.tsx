"use client";

import { lazy } from "react";
import { SceneViewport } from "@/components/scenes/scene-viewport";

const NewspaperScene = lazy(() => import("./newspaper-scene"));

function NewspaperArtwork({ headline }: { headline: string }) {
  return (
    <div className="@container relative isolate aspect-7/5 w-full border border-stone-400 bg-amber-50 shadow-lg
      before:absolute before:inset-0 before:-z-10 before:translate-x-0.5 before:translate-y-1 before:border before:border-stone-400 before:bg-stone-200">
      <div className="absolute inset-0 bg-linear-to-br from-stone-100 via-amber-50 to-stone-300" />
      <p className="absolute inset-x-1/24 top-1/20 flex h-1/4 items-center justify-center border-y-2 border-ink font-serif text-newsprint-masthead leading-none font-black whitespace-nowrap">The Pud Log</p>
      <div className="absolute inset-x-1/24 top-1/3 bottom-1/12 grid grid-cols-3 gap-x-2 border-b-2 border-ink pb-1.5">
        <img src="/pud-log-engraving.webp" alt="" width="1152" height="768" loading="lazy"
          className="col-span-2 h-full min-h-0 w-full object-cover mix-blend-multiply grayscale" />
        <div className="flex min-h-0 flex-col gap-1 overflow-hidden border-s border-stone-500 ps-1.5">
          <p className="line-clamp-4 font-serif text-newsprint-headline leading-tight font-bold wrap-anywhere">{headline}</p>
          <div className="grow bg-newsprint-lines" />
        </div>
      </div>
    </div>
  );
}

export function Newspaper({ headline }: { headline: string }) {
  const artwork = (
    <div className="absolute inset-0 grid place-items-center">
      <div className="w-4/5 -rotate-6"><NewspaperArtwork headline={headline} /></div>
    </div>
  );
  return (
    <div aria-hidden="true" className="pointer-events-none relative aspect-16/9 w-full">
      <div className="absolute top-1/5 right-1/16 w-2/3 rotate-8 brightness-75">
        <NewspaperArtwork headline={headline} />
      </div>
      <div className="absolute top-0 left-0 aspect-4/3 w-11/12 drop-shadow-lg motion-safe:transition-transform motion-safe:duration-300
        motion-safe:group-hover/news:-translate-y-2 motion-safe:group-hover/news:-rotate-1 motion-safe:group-focus-visible/news:-translate-y-2">
        <SceneViewport artwork={artwork}>
          {() => <NewspaperScene headline={headline} fallback={artwork} />}
        </SceneViewport>
      </div>
    </div>
  );
}
