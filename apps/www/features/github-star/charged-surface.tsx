import type { Ref } from "react";

export function ChargedSurface({ meter }: { meter: Ref<HTMLCanvasElement> }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-0 group-data-spotlight:opacity-100">
      <span className="absolute -inset-1 rounded-full bg-fuchsia-400 opacity-[calc(var(--star-preview,0)*.24)] blur-md" />
      <span className="absolute -inset-1 rounded-full bg-blue-500 opacity-[var(--star-bloom,0)] blur-md" />
      <span className="absolute inset-0 overflow-hidden rounded-full bg-star-chrome">
        <span className="absolute top-1/2 left-1/2 aspect-square w-5/4 -translate-1/2 bg-star-arc motion-safe:group-data-spotlight:animate-star-rim" />
        <span className="absolute inset-0 bg-star-chrome-hot opacity-[var(--star-power,0)]" />
        <span className="absolute top-1/2 left-1/2 aspect-square w-5/4 -translate-1/2 bg-star-arc-hot
          opacity-[var(--star-power,0)] motion-safe:group-data-energized:animate-star-rim-hot" />
        <span className="absolute inset-px overflow-hidden rounded-full bg-star-enamel">
          <span className="absolute inset-0 bg-star-enamel-hot opacity-[var(--star-power,0)]" />
          <canvas ref={meter} className="absolute inset-0 size-full" />
          <span className="absolute inset-0 bg-crt-scanlines opacity-60" />
          <span className="absolute inset-0 bg-crt-glare" />
          <span className="absolute inset-y-0 left-1/4 w-3/4 -skew-x-20 bg-linear-to-r from-transparent via-white/60 to-transparent
            opacity-0 mix-blend-screen motion-safe:group-data-shimmer:animate-star-sheen-preview motion-safe:group-data-energized:animate-star-sheen-hot" />
          <span className="absolute inset-0 bg-linear-to-br from-cyan-100/50 via-blue-300/25 to-transparent opacity-[var(--star-flash,0)]" />
        </span>
      </span>
      <span className="absolute -top-1 right-4 size-2.5 clip-star-glint bg-cyan-100 motion-safe:group-data-spotlight:animate-star-twinkle-offset" />
      <span className="absolute -bottom-1 left-1/3 size-2 clip-star-glint bg-sky-100 motion-safe:group-data-spotlight:animate-star-twinkle" />
    </span>
  );
}
