"use client";

import { useEffect, useRef } from "react";

const operatorArt = "/editions/round-four/hotline/operator.webp";

// The print is cropped to fill its stage. Both lenses stay in source-image coordinates.
const lenses = [
  { x: 536, y: 412, w: 132, h: 132 },
  { x: 876, y: 313, w: 146, h: 164 },
];

export function HotlineOperator({ line, revision }: { line: number; revision: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const print = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const area = stage.current;
    if (!area) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    function look(x: number, y: number) {
      area?.style.setProperty("--look-x", String(x));
      area?.style.setProperty("--look-y", String(y));
    }
    function rest() { look(line - 1, (line - 1) / 2); }
    function move(event: PointerEvent) {
      if (!area || reduce.matches || event.pointerType !== "mouse") return;
      const rect = area.getBoundingClientRect();
      look(2 * (event.clientX - rect.left) / rect.width - 1, 2 * (event.clientY - rect.top) / rect.height - 1);
    }
    rest();
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", rest);
    const pickup = revision && !reduce.matches ? print.current?.animate(
      [{ rotate: "-1deg", scale: "1.03" }, { rotate: "1.6deg", scale: "1.10", offset: 0.28 }, { rotate: "-1deg", scale: "1.03" }],
      { duration: 440, easing: "ease-out" },
    ) : undefined;
    return () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", rest);
      pickup?.cancel();
    };
  }, [line, revision]);

  return (
    <div ref={stage} className="relative isolate grow overflow-hidden" style={{ minHeight: "clamp(12rem, 31vw, 32rem)", containerType: "size" }}>
      <div ref={print} className="absolute top-1/2 left-1/2 aspect-3/2 -translate-1/2 -rotate-1 scale-103" style={{ width: "max(100%, 150cqh)" }}>
        <img src={operatorArt} width="1200" height="800" alt="Pud leans into the mouthpiece of a black telephone." className="size-full" />
        {lenses.map(lens => (
          <span key={lens.x} aria-hidden="true" className="pointer-events-none absolute overflow-hidden motion-reduce:hidden"
            style={{ left: `${100*(lens.x-lens.w/2)/1536}%`, top: `${100*(lens.y-lens.h/2)/1024}%`,
              width: `${100*lens.w/1536}%`, height: `${100*lens.h/1024}%`,
              maskImage: "radial-gradient(ellipse, black 48%, transparent 72%)" }}>
            <span className="absolute" style={{ width: `${1536/lens.w*100}%`, height: `${1024/lens.h*100}%`,
              left: `${(0.5-lens.x/lens.w)*100}%`, top: `${(0.5-lens.y/lens.h)*100}%`,
              background: `url(${operatorArt}) center/100% 100%`,
              transform: "translate(calc(var(--look-x, 0) * .54%), calc(var(--look-y, 0) * .6%))" }} />
          </span>
        ))}
      </div>
    </div>
  );
}
