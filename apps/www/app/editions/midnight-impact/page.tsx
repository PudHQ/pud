import type { Metadata } from "next";
import { editionPath, featuredRemix } from "@/features/editions/catalog";
import { MidnightImpact } from "@/features/editions/remix/midnight-impact";

export const metadata: Metadata = {
  title: `${featuredRemix.title} · Pud Editions`,
  description: featuredRemix.description,
};

const link = "inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function MidnightImpactPage() {
  return (
    <>
      <MidnightImpact />
      <nav aria-label="Related Pud editions" className="border-t border-stone-400 bg-stone-100 px-4 py-2 font-mono text-xs text-ink sm:px-8">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-x-4">
          <a href="/editions" className={link}>← Editions</a>
          <div className="flex gap-4 sm:gap-6">
            <a href={editionPath("crash-test")} className={link}>Crash Test</a>
            <a href={editionPath("night-shift")} className={link}>Night Shift</a>
          </div>
        </div>
      </nav>
    </>
  );
}
