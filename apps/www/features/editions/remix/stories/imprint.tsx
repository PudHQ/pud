import { alphaEntryPath } from "@/lib/links";

export const blob = "https://github.com/PudHQ/pud/blob/main/packages/pud";
export const example = `${blob}/.examples`;
export const artwork = "/editions/remix/stories";
export const action = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4";
export const sourceLink = "inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-current/50 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2";

export function Imprint({ title }: { title: string }) {
  return (
    <nav aria-label={title} className="flex flex-wrap items-center justify-between gap-x-3 border-b border-current/35 font-mono text-xs">
      <a href="/" className="inline-flex min-h-11 items-center gap-2 font-bold hover:underline focus-visible:outline-2">
        <b className="font-sans text-base font-black">Pud.</b><span className="font-normal">{title}</span>
      </a>
      <a href={alphaEntryPath} className="inline-flex min-h-11 items-center hover:underline focus-visible:outline-2">Join the alpha ↗</a>
    </nav>
  );
}
