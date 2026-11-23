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
    <div className="pointer-events-none relative h-28 w-35 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 sm:mr-7 sm:h-37 sm:w-60 lg:mr-12 lg:h-41 lg:w-72 small-phone:w-27" aria-hidden="true">
      <div className="absolute inset-x-1/5 bottom-3 h-6 bg-radial from-ink/20 to-transparent blur-sm" />
      <SceneViewport artwork={artwork}>
        {() => <NewspaperScene fallback={artwork} />}
      </SceneViewport>
    </div>
  );
}
