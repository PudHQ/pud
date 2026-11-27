"use client";

import { type AnimationEvent, type PointerEvent, type RefObject, useEffect, useId, useLayoutEffect, useRef } from "react";
import { cueCurtainImpact } from "./curtain-impact";

export const curtainArt = [
  { src: "/github-star-curtain-pud.webp", alt: "An exhausted Pud drifting through violet clouds" },
  { src: "/github-star-curtain-octocat.webp", alt: "Octocat with spiral eyes and stars circling its head" },
];
export const speechFade = 200;

const balloons = [
  {
    lines: ["We can't hold on", "for much longer...!"],
    textCenter: [49.7, 54.8],
    paper: `M192 3 C185 15 171 22 155 25
      C119 20 72 26 44 41 C20 53 13 70 23 86
      C36 108 80 119 125 117 C171 116 211 104 228 87
      C245 70 235 50 212 38 C201 32 187 28 174 26
      C183 20 190 11 192 3 Z`,
    ink: `M22 81 C34 104 72 116 122 116 C80 120 40 112 26 93 Z
      M213 40 C235 50 245 71 227 88 C239 70 233 56 213 40 Z`,
    weight: 2,
  },
  {
    lines: ["I said...", "We can't hold on", "for much longer!"],
    textCenter: [50, 54.6],
    paper: `M192 3 C186 13 170 22 153 25
      C137 22 122 17 106 23 C94 26 85 22 72 28
      C64 33 49 31 38 40 C30 46 18 51 20 62
      C20 68 13 73 18 83 C23 94 37 94 46 102
      C59 112 74 108 86 114 C101 119 117 115 132 118
      C150 121 165 112 181 113 C196 112 204 101 219 98
      C231 94 229 82 237 75 C247 63 237 51 227 47
      C216 43 215 35 205 33 C193 31 185 27 174 26
      C182 19 188 11 192 3 Z`,
    ink: `M9 54 Q3 64 7 77 Q0 67 9 54 Z
      M7 84 Q11 96 23 101 Q10 100 7 84 Z
      M243 44 Q253 49 252 61 Q250 53 243 44 Z
      M245 89 Q241 104 224 107 Q238 100 245 89 Z`,
    weight: 2.1,
  },
  {
    lines: ["Damnit, can you", "move your mouse", "away from this", "friggin' button?!"],
    textCenter: [50.2, 56],
    paper: `M192 3 L177 29 L201 19 L200 34 L225 27 L220 43
      L244 42 L233 54 L252 61 L239 71 L252 86 L229 88
      L237 106 L214 101 L207 118 L187 111 L175 124
      L154 115 L138 125 L120 118 L97 125 L85 117
      L63 121 L59 110 L36 112 L39 99 L15 102 L21 88
      L5 79 L20 68 L5 55 L28 51 L23 37 L46 39
      L48 24 L70 32 L80 20 L94 27 L113 19 L131 25
      L151 18 L158 26 Z`,
    ink: `M7 41 L1 34 L14 38 Z M248 28 L255 19 L252 32 Z
      M241 111 L254 118 L240 116 Z M18 112 L9 122 L14 111 Z`,
    weight: 2.35,
  },
];

export const speechCount = balloons.length;

function inkBalloon(canvas: HTMLCanvasElement, line: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const style = getComputedStyle(canvas);
  const ink = style.getPropertyValue("--color-ink").trim();
  const { paper, weight, ink: accents } = balloons[line];
  const outline = new Path2D(paper);

  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.clearRect(0, 0, 256, 128);
  ctx.lineWidth = weight;
  ctx.lineJoin = line === 2 ? "miter" : "round";
  ctx.miterLimit = 2.4;
  ctx.fillStyle = style.getPropertyValue("--color-white").trim();
  ctx.fill(outline);
  ctx.strokeStyle = ink;
  ctx.stroke(outline);
  ctx.fillStyle = ink;
  ctx.fill(new Path2D(accents));
}

export function OctocatSpeech({ line }: { line: number | null }) {
  const art = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (line !== null && art.current) inkBalloon(art.current, line);
  }, [line]);

  return (
    <span aria-hidden="true" data-speaking={line !== null ? "" : undefined}
      style={{ transitionDuration: `${speechFade}ms` }}
      className="pointer-events-none absolute top-(--star-mouth-y) left-(--star-mouth-x) z-10 aspect-2/1 w-70 @container
        -translate-x-3/4 -translate-y-1 origin-[75%_0] scale-95 opacity-0
        data-speaking:translate-y-0 data-speaking:scale-100 data-speaking:opacity-100
        transition-none motion-safe:transition-[translate,scale,opacity] motion-safe:ease-out phone:w-54 small-phone:w-51">
      <span className="absolute inset-0 origin-[75%_0] [transform:var(--star-speech-pan,none)]">
        <canvas ref={art} width={512} height={256} className="absolute inset-0 size-full drop-shadow-sm drop-shadow-black/60" />
        {balloons.map(({ lines, textCenter: [x, y] }, index) => (
          <span key={lines[0]} data-line={line === index ? "" : undefined}
            style={{ left: `${x}%`, top: `${y}%`, transitionDuration: `${speechFade}ms` }}
            className={`absolute flex w-[68%] -translate-1/2 flex-col items-center font-citrustime
              text-center leading-[1.07] whitespace-nowrap text-ink opacity-0 data-line:opacity-100
              transition-none motion-safe:transition-opacity ${index === 2 ? "text-[max(.6875rem,5.5cqw)]" : "text-[max(.75rem,6cqw)]"}`}>
            {lines.map((text) => <span key={text}>{text} </span>)}
          </span>
        ))}
      </span>
    </span>
  );
}

export function StarCurtain({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const title = useId();
  const artwork = useRef<HTMLDivElement>(null);
  const sparks = useRef<HTMLCanvasElement>(null);
  const cancelImpact = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => cancelImpact.current?.(), []);

  function strike(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.animationName !== "star-curtain-in" || !sparks.current || !artwork.current) return;
    cancelImpact.current?.();
    cancelImpact.current = cueCurtainImpact(sparks.current, artwork.current);
  }

  function panArtwork(event: PointerEvent<HTMLDialogElement>) {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { currentTarget: modal, clientX, clientY } = event;
    const x = (clientX / modal.clientWidth - 0.5) * 2;
    const y = (clientY / modal.clientHeight - 0.5) * 2;
    modal.style.setProperty("--curtain-pan-x", `${x * 10}px`);
    modal.style.setProperty("--curtain-pan-y", `${y * 7}px`);
  }

  function centerArtwork() {
    dialog.current?.style.removeProperty("--curtain-pan-x");
    dialog.current?.style.removeProperty("--curtain-pan-y");
  }

  function goBack() {
    const modal = dialog.current;
    if (!modal?.open || modal.hasAttribute("data-closing")) return;
    const panels = modal.querySelectorAll<HTMLElement>("[data-curtain-panel]");
    for (const panel of panels) panel.style.setProperty("--curtain-exit-start", getComputedStyle(panel).translate);
    cancelImpact.current?.();
    modal.setAttribute("data-closing", "");
    const exit = Array.from(panels).flatMap((panel) => panel.getAnimations().map((animation) => animation.finished));
    void Promise.allSettled(exit).then(() => {
      modal.close();
      centerArtwork();
      modal.removeAttribute("data-closing");
      for (const panel of panels) panel.style.removeProperty("--curtain-exit-start");
    });
  }

  return (
    <dialog ref={dialog} aria-labelledby={title} onCancel={(event) => { event.preventDefault(); goBack(); }}
      onPointerMove={panArtwork} onPointerLeave={centerArtwork}
      className="group/curtain fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0
        backdrop:bg-ink motion-safe:backdrop:animate-star-curtain-backdrop motion-safe:data-closing:backdrop:animate-star-curtain-backdrop-out">
      <div className="grid h-full grid-rows-[minmax(0,52%)_1fr] overflow-x-hidden overflow-y-auto overscroll-contain md:grid-cols-2 md:grid-rows-1">
        <div ref={artwork} className="grid min-h-0 grid-rows-2">
          {curtainArt.map(({ src, alt }, index) => (
            <div key={src} data-curtain-panel className={`relative min-h-0 overflow-hidden border-ink bg-violet-200 [--curtain-side:-1]
              motion-safe:animate-star-curtain-in motion-safe:group-data-closing/curtain:animate-star-curtain-out md:border-r-3 ${index === 0 ?
                "border-b-2 [--curtain-depth:.8] [--curtain-rise:-12%]" :
                "border-t-2 [--curtain-delay:37ms] [--curtain-depth:-1.15] [--curtain-rise:15%]"}`}>
              <img src={src} loading="lazy" alt={alt} className={`absolute inset-0 size-full object-cover
                motion-safe:animate-star-curtain-art motion-safe:transition-transform motion-safe:duration-250
                motion-safe:[transform:translate3d(calc(var(--curtain-pan-x,0px)*var(--curtain-depth)),calc(var(--curtain-pan-y,0px)*var(--curtain-depth)),0)]
                ${index === 0 ? "object-center" : "origin-[50%_26%] object-top"}`} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-2.5 border border-white/35 md:inset-4" />
            </div>
          ))}
        </div>
        <div data-curtain-panel onAnimationStart={strike} className="relative isolate flex flex-col items-start justify-center gap-6 border-t-4 border-ink bg-violet-100
          bg-star-curtain-paper bg-size-[auto,6px_6px,auto] px-7 py-7 text-ink [--curtain-delay:17ms] [--curtain-side:1] motion-safe:animate-star-curtain-in
          motion-safe:group-data-closing/curtain:animate-star-curtain-out md:border-t-0 md:border-l-3 md:px-10 lg:gap-9 lg:px-16">
          <h2 id={title} className="font-citrustime text-[clamp(1.625rem,7.4vw,2.25rem)] leading-[.99] text-pretty
            md:text-[clamp(2rem,4.15vw,5.5rem)]">
            You hovered over the button until we could no longer take&nbsp;it...
          </h2>
          <button type="button" onClick={goBack}
            className="inline-flex min-h-11 -skew-x-6 cursor-pointer items-center gap-3 border-2 border-ink font-citrustime
              bg-paper px-5 py-2 text-2xl leading-none shadow-star-curtain-button hover:bg-white active:translate-y-0.5
              focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink
              motion-safe:transition-[background-color,translate]">
            Go Back <span aria-hidden="true" className="h-4.5 w-6 skew-x-6 clip-star-return-arrow bg-ink" />
          </button>
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <canvas ref={sparks} hidden className="size-full [--star-impact-core:var(--color-yellow-50)]
          [--star-impact-edge:var(--color-orange-500)] [--star-impact-gold:var(--color-amber-400)]" />
      </span>
    </dialog>
  );
}
