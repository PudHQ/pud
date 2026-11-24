import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import { GitHubStarSpotlight } from "./github-star-spotlight";

const repository = "rorz/pud";

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
      className="relative inline-flex min-h-6 min-w-8 items-center justify-center gap-1 rounded-md border border-pink-300/40
        bg-linear-to-b from-violet-950 to-black px-1.5 font-mono text-star-count leading-none text-pink-100 tabular-nums
        inset-shadow-xs inset-shadow-black group-data-charging:border-sky-200/75 group-data-charging:from-blue-950
        group-data-charging:text-sky-50 group-data-charged:text-shadow-sm group-data-charged:text-shadow-cyan-200
        motion-safe:transition-[color,border-color,--tw-gradient-from,text-shadow] motion-safe:duration-220
        phone:row-start-2 phone:min-h-4 phone:min-w-0 phone:gap-0.5 phone:px-px phone:text-xs"
    >
      <span aria-hidden="true">{count.short}</span>
      <span aria-hidden="true" className="relative size-3 clip-star-crystal bg-star-facets
        motion-safe:group-data-energized:animate-star-crystal phone:size-1.75">
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
