import { alphaEntryPath } from "@/lib/links";

export const art = "/editions/remix/places";
export const source = "https://github.com/PudHQ/pud/blob/main";
export const example = `${source}/packages/pud/.examples`;
export const navLink = "inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";
export const caps = "font-mono text-xs font-bold tracking-widest uppercase";
export const control = "min-h-11 cursor-pointer font-bold focus-visible:outline-2 focus-visible:outline-offset-2";

export function PudHome({ name }: { name: string }) {
  return <a href="/" aria-label={`${name} · Pud home`} className={`${navLink} gap-2 font-bold`}><img src="/pud.svg" alt="" width="30" height="30" className="size-7 object-contain" /> Pud</a>;
}

export function AlphaLink() {
  return <a className={`${navLink} text-sm font-semibold`} href={alphaEntryPath}>Join the alpha ↗</a>;
}

export function ProofLink({ href, children = "Read the TypeScript proof" }: { href: string; children?: string }) {
  return <a href={href} className={`${navLink} mt-1 font-mono text-sm underline`}>{children} ↗</a>;
}
