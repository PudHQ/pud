import { unstable_cache } from "next/cache";
import { Suspense } from "react";

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
    <span title={label} className="font-mono text-star-count tabular-nums">
      <span aria-hidden="true">{count.short}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function GitHubStarLink() {
  return (
    <a
      href={`https://github.com/${repository}`}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap hover:text-cyan
        focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-paper phone:flex-col phone:gap-0.5"
    >
      <span><span className="phone:sr-only">Star on </span>GitHub</span>
      <span className="inline-flex items-center gap-1 text-cyan">
        <span aria-hidden="true" className="leading-none">★</span>
        <Suspense fallback={null}><StarCount /></Suspense>
      </span>
    </a>
  );
}
