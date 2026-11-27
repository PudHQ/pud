import { alphaEntryPath } from "@/lib/links";

export const fixtureRoot = "https://github.com/PudHQ/pud/blob/main/packages/pud/.examples/";
export const control = "min-h-11 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4";
export function BenchNav({ name, source }: { name: string; source: string }) {
  return <nav aria-label={name} className="flex flex-wrap items-center justify-between gap-x-4 border-b border-current/45 py-1.5">
    <a href="/" className="inline-flex min-h-11 items-center gap-2 text-lg leading-none font-extrabold tracking-tight">
      <img src="/pud.svg" width="28" height="28" alt="" className="size-7" />Pud <span className="font-normal opacity-55">/</span> {name}
    </a>
    <div className="flex gap-4 font-mono text-xs font-semibold sm:gap-6">
      <a href={source} className="inline-flex min-h-11 items-center hover:underline">Source ↗</a>
      <a href={alphaEntryPath} className="inline-flex min-h-11 items-center hover:underline">Join alpha ↗</a>
    </div>
  </nav>;
}
