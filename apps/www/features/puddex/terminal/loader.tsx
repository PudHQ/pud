import type { CSSProperties } from "react";

export const loaderBloomDuration = 460;

function OpenDex({ address }: { address: string }) {
  return <a href={address} target="_blank" rel="noopener" className="text-sm text-[#ffb8ce] underline underline-offset-4">Open PudDex ↗</a>;
}

export function DexLoader({ progress, failed, address }: { progress: number; failed: boolean; address: string }) {
  const complete = progress === 100;
  const filled = Math.floor(progress * 40 / 100) / 40 * 100;
  const fill = { "--pud-fill": `${100 - filled}%` } as CSSProperties;

  return (
    <div className="puddex-loader absolute inset-0 z-30 grid place-items-center overflow-hidden bg-[#100c14]" data-complete={complete}>
      <div className="puddex-loader-halo pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative grid justify-items-center gap-6">
        <div className="relative size-[clamp(8rem,16vw,12rem)]" aria-hidden="true">
          <div className="puddex-loader-pixels" />
          <img src="/puddex-loader-outline.png" alt="" width="40" height="40" className="pixelated absolute inset-0 size-full select-none opacity-70" />
          <div className="puddex-loader-fill absolute inset-0">
            <img src="/puddex-loader.png" alt="" width="40" height="40" style={fill}
              className="puddex-loader-clip pixelated size-full select-none" />
          </div>
        </div>
        {failed ? <OpenDex address={address} /> : (
          <div className="grid justify-items-center gap-2 font-mono text-sm tracking-widest text-[#f2a4bc]">
            <span className="puddex-loader-caption font-semibold">Loading the proof factory</span>
            <span role="progressbar" aria-label="Loading PudDex" aria-valuenow={progress} className="tabular-nums">{progress}%</span>
          </div>
        )}
        <noscript><OpenDex address={address} /></noscript>
      </div>
    </div>
  );
}
