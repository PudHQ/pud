"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { NavAction } from "@/components/nav-action";
import { attachSpotlight } from "./attach-spotlight";
import { OctocatSpeech, StarCurtain } from "./comic";
import { ChargedSurface } from "./charged-surface";

function Octocat() {
  return (
    <span aria-hidden="true" className="relative block size-6 grayscale-[calc(1_-_var(--star-light,0))] phone:size-5">
      <span className="absolute inset-0 bg-octocat-relief bg-size-(--background-size-octocat-relief) bg-left bg-no-repeat
        opacity-[calc(1_-_var(--star-power,0))]" />
      <span className="absolute inset-0 opacity-[var(--star-power,0)] motion-safe:group-data-energized:animate-octocat-startle">
        <span className="absolute inset-0 bg-octocat-relief bg-size-(--background-size-octocat-relief) bg-right bg-no-repeat
          motion-safe:group-data-energized:animate-octocat-shudder" />
      </span>
    </span>
  );
}

export function GitHubStarSpotlight({ href, children }: { href: string; children: ReactNode }) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const medallion = useRef<HTMLSpanElement>(null);
  const chargeFill = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const curtain = useRef<HTMLDialogElement>(null);
  const [speech, setSpeech] = useState<number | null>(null);

  useEffect(() => {
    const link = anchor.current;
    const face = panel.current;
    const icon = medallion.current;
    const meter = chargeFill.current;
    const canvas = overlay.current;
    const dialog = curtain.current;
    if (!link || !face || !icon || !meter || !canvas || !dialog) return;

    return attachSpotlight(link, face, icon, meter, canvas, dialog, setSpeech);
  }, []);

  return (
    <>
      <NavAction ref={anchor} href={href} target="_blank" rel="noopener" tone="black"
        className="group data-spotlight:z-50 focus-visible:z-50">
        <span ref={panel} className="relative isolate inline-flex min-h-11 items-center gap-2 rounded-full px-4
          group-active:translate-y-px phone:gap-1 phone:px-2.5 small-phone:has-data-star-count:grid
          small-phone:grid-flow-col small-phone:content-center small-phone:justify-items-start small-phone:gap-x-1.5 small-phone:gap-y-0.5">
          <ChargedSurface meter={chargeFill} />
          <span ref={medallion} aria-hidden="true" className="relative grid shrink-0 place-items-center rounded-full small-phone:row-span-2">
            <Octocat />
            <span className="absolute inset-0 opacity-[var(--star-power,0)]">
              <span className="absolute -top-1 -right-0.5 size-2.5 clip-octocat-bolt bg-cyan-100 motion-safe:group-data-energized:animate-star-twinkle-hot" />
              <span className="absolute top-0 -left-1 size-2 -rotate-20 clip-octocat-bolt bg-sky-200 motion-safe:group-data-energized:animate-star-twinkle-offset" />
            </span>
          </span>
          <span className="relative isolate group-data-charging:text-shadow-star-emboss before:pointer-events-none before:absolute
            before:-inset-1 before:-z-10 before:rounded-md before:bg-star-label-inset before:opacity-[var(--star-power,0)]">
            <span className="phone:sr-only">Star on </span>GitHub
          </span>
          {children}
        </span>
        <OctocatSpeech line={speech} />
      </NavAction>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
        <canvas ref={overlay} hidden className="block size-full" />
      </div>
      <StarCurtain dialog={curtain} />
    </>
  );
}
