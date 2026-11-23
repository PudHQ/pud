"use client";

import { lazy } from "react";
import { SceneViewport } from "../scenes/scene-viewport";

const NewspaperScene = lazy(() => import("./newspaper-scene"));

function NewspaperArtwork() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative w-3/4 max-w-47 -rotate-8 border border-stone-400 bg-stone-50 p-1.5 shadow-md sm:p-2">
        <div className="absolute inset-0 -z-10 translate-x-1 translate-y-1 border border-stone-400 bg-stone-200" />
        <p className="border-y border-ink py-0.5 text-center font-serif text-sm leading-none font-black sm:text-lg">The Pud Log</p>
        <img src="/pud-log-engraving.webp" alt="" width="1152" height="768" loading="lazy" className="pixelated mt-1 aspect-8/5 w-full object-cover" />
      </div>
    </div>
  );
}

export function Newspaper() {
  const artwork = <NewspaperArtwork />;
  return (
    <div className="pointer-events-none relative aspect-4/3 w-full max-w-78
      motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-focus-visible:-translate-y-1" aria-hidden="true">
      <div className="absolute inset-x-1/5 bottom-1/12 h-1/6 bg-radial from-ink/35 to-transparent blur-sm" />
      <SceneViewport artwork={artwork}>
        {() => <NewspaperScene fallback={artwork} />}
      </SceneViewport>
    </div>
  );
}
