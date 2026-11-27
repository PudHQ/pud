import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { GitHubStarSpotlight } from "./spotlight-link";

const repository = "PudHQ/pud";

async function fetchMetadata(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "pud.dev" },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

const getStarCount = unstable_cache(async () => {
  const repo = await fetchMetadata(`https://api.github.com/repos/${repository}`);
  const count = repo?.stargazers_count;
  if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0) {
    return { short: count.toLocaleString("en-US", { notation: "compact" }), full: count.toLocaleString("en-US") };
  }

  // Shields caches GitHub's count and can serve it when the Worker cannot reach the API.
  const badge = await fetchMetadata(`https://img.shields.io/github/stars/${repository}.json`);
  const text = badge?.message;
  if (badge?.isError || typeof text !== "string" || !/^\d+(?:\.\d+)?[kMGTPEZY]?$/.test(text)) return null;
  return { short: text, full: text };
}, ["github-stars", repository], { revalidate: 300 });

async function StarCount() {
  const count = await getStarCount();
  if (count === null) return null;

  const label = `${count.full} ${count.full === "1" ? "star" : "stars"}`;
  return (
    <span
      title={label}
      data-star-count
      className="inline-flex items-center gap-1 border-s border-white/30 ps-2 font-mono text-xs leading-none text-neutral-200 tabular-nums
        group-data-charging:border-sky-200/75 group-data-charging:text-white phone:ps-1.5
        small-phone:col-start-2 small-phone:row-start-2 small-phone:gap-0.5 small-phone:border-0 small-phone:ps-0"
    >
      <span aria-hidden="true">{count.short}</span>
      <span aria-hidden="true" className="relative size-2.5 clip-star-crystal bg-neutral-200
        motion-safe:group-data-energized:animate-star-crystal">
        <span className="absolute inset-0 bg-star-facets opacity-[var(--star-light,0)]" />
        <span className="absolute inset-0 bg-linear-to-br from-white via-cyan-200 to-blue-400 opacity-[var(--star-power,0)]" />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function GitHubStarLink() {
  return (
    <GitHubStarSpotlight href={`https://github.com/${repository}`}>
      <Suspense fallback={null}><StarCount /></Suspense>
    </GitHubStarSpotlight>
  );
}
