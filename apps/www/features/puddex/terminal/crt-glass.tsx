import { crtFrameName, crtWarpScale, rasterDisplacement } from "@pud/crt";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { glassOutline } from "../glass-profile";

// PudDex's phone layout kicks in at 640 pixels. Scale its desktop viewport into the glass.
const desktopViewportWidth = 672;
const glassClip = { clipPath: "url(#puddex-glass-shape)" };

export function CrtGlass({ lit, src, showPage, address, children }: {
  lit: boolean;
  src?: string;
  showPage: boolean;
  address: string;
  children: ReactNode;
}) {
  const tube = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number; map: string | null }>();

  useEffect(() => {
    const element = tube.current;
    if (!element) return;
    function measure() {
      if (!element) return;
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      setViewport({ width, height, map: rasterDisplacement(height / width) });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = viewport ? Math.min(1, viewport.width / desktopViewportWidth) : 1;
  const iframeStyle = viewport && scale < 1 ? {
    width: desktopViewportWidth, height: `${100 / scale}%`, transform: `scale(${scale})`,
  } : undefined;
  const curveStyle = viewport?.map ? { filter: "url(#puddex-glass-curve)" } : undefined;
  const pageVisibility = showPage ? "" : "invisible";

  return (
    <>
      <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
        <defs>
          <clipPath id="puddex-glass-shape" clipPathUnits="objectBoundingBox"><path d={glassOutline} /></clipPath>
          {viewport?.map && (
            <filter id="puddex-glass-curve" x="0" y="0" width={viewport.width} height={viewport.height} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feImage href={viewport.map} x="0" y="0" width={viewport.width} height={viewport.height} preserveAspectRatio="none" result="raster" />
              <feDisplacementMap in="SourceGraphic" in2="raster" scale={viewport.width * crtWarpScale} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          )}
        </defs>
      </svg>
      <div ref={tube} id="puddex-crt" className="absolute inset-0">
        <div className="absolute inset-0 flex flex-col overflow-hidden bg-neutral-950" style={glassClip}>
          {src && (
            <div className={`flex min-h-0 flex-1 flex-col ${pageVisibility}`}>
              <a href={address} target="_blank" rel="noopener"
                className="group relative z-10 flex min-h-12 shrink-0 items-center justify-center border-b border-white/10 bg-black px-4 pt-2.5 pb-1.5
                  shadow-lg shadow-black/85 focus-visible:outline-none">
                <span className="relative grid min-h-8 w-full max-w-64 place-items-center rounded-full border border-white/15 bg-linear-to-b
                  from-neutral-800 to-neutral-900 px-8 font-mono text-base leading-none whitespace-nowrap text-paper/90
                  group-hover:border-white/30 group-hover:text-paper group-focus-visible:outline-2 group-focus-visible:outline-offset-2
                  group-focus-visible:outline-paper/80">
                  {address}
                  <span aria-hidden="true" className="absolute inset-y-0 end-3 grid place-items-center text-xs text-stone-400">↗</span>
                </span>
                <span className="sr-only"> (open PudDex in a new tab)</span>
              </a>
              <div className="min-h-0 flex-1 overflow-hidden">
                <iframe name={crtFrameName} src={src} title="PudDex wiki" style={iframeStyle}
                  className="block size-full origin-top-left border-0 bg-neutral-950 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper" />
              </div>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 z-20" style={curveStyle}>{children}</div>
        </div>
        {lit && <div className="pointer-events-none absolute -inset-px rounded-[16%] shadow-[0_0_0.65rem_#b1d8fd16]" aria-hidden="true" />}
        <div className="pointer-events-none absolute inset-0" style={glassClip} aria-hidden="true">
          {lit && (
            <>
              <div className="absolute inset-0" style={curveStyle}>
                <div className="absolute inset-0 bg-crt-scanlines" />
                <div className="absolute inset-0 bg-crt-phosphor" />
              </div>
              <div className="absolute inset-0 bg-linear-to-b from-transparent from-36% via-white/5 via-50% to-transparent to-64% motion-safe:animate-crt-refresh motion-reduce:hidden" />
            </>
          )}
          <div className="absolute inset-0 bg-crt-glare shadow-crt-glass" />
        </div>
      </div>
    </>
  );
}
