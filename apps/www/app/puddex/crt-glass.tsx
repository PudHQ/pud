import { crtFrameName, crtWarpScale, rasterDisplacement } from "@pud/crt";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { glassOutline } from "./glass-profile";

// PudDex's phone layout kicks in at 640 pixels. Scale its desktop viewport into the glass.
const desktopViewportWidth = 672;

export function CrtGlass({ lit, src, children }: { lit: boolean; src?: string; children: ReactNode }) {
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
    width: desktopViewportWidth, height: viewport.height / scale, transform: `scale(${scale})`,
  } : undefined;

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
      <div ref={tube} id="puddex-crt" className="absolute inset-0 overflow-hidden bg-neutral-950" style={{ clipPath: "url(#puddex-glass-shape)" }}>
        {src && <iframe name={crtFrameName} src={src} title="PudDex wiki" style={iframeStyle}
          className="block size-full origin-top-left border-0 bg-neutral-950 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper" />}
        <div className="pointer-events-none absolute inset-0" style={viewport?.map ? { filter: "url(#puddex-glass-curve)" } : undefined}>
          {children}
          {lit && (
            <>
              <div className="absolute inset-0 bg-crt-scanlines" aria-hidden="true" />
              <div className="absolute inset-0 bg-crt-phosphor" aria-hidden="true" />
              <div className="absolute inset-0 bg-linear-to-b from-transparent from-36% via-white/5 via-50% to-transparent to-64% motion-safe:animate-crt-refresh motion-reduce:hidden" aria-hidden="true" />
            </>
          )}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-crt-glare shadow-crt-glass" aria-hidden="true" />
      </div>
    </>
  );
}
