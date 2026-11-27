import { unstable_cache } from "next/cache";
import { SaxesParser } from "saxes";
import { pudLog } from "@/lib/links";

export type Issue = { title: string; url: string; published: string };

export const firstIssue: Issue = {
  title: "Is building in public dead?",
  url: `${pudLog}/p/is-building-in-public-dead`,
  published: "2026-11-20T06:41:16.000Z",
};

type FeedItem = { title: string; link: string; pubDate: string };

export function readIssues(xml: string): Issue[] {
  const issues: Issue[] = [];
  const stack: string[] = [];
  const parser = new SaxesParser();
  let item: FeedItem | null = null;
  let field: keyof FeedItem | null = null;

  parser.on("opentag", ({ name }) => {
    stack.push(name);
    if (stack.length === 3 && stack.join("/") === "rss/channel/item") {
      item = { title: "", link: "", pubDate: "" };
    }
    if (item && stack.length === 4 && (name === "title" || name === "link" || name === "pubDate")) {
      field = name;
    }
  });

  const append = (value: string) => {
    if (item && field) item[field] += value;
  };
  parser.on("text", append);
  parser.on("cdata", append);
  parser.on("closetag", () => {
    if (stack.length === 4) field = null;
    if (stack.length === 3 && item) {
      const url = URL.parse(item.link.trim());
      const title = item.title.trim();
      const date = Date.parse(item.pubDate);
      if (title && url?.origin === pudLog && url.pathname.startsWith("/p/") && Number.isFinite(date)) {
        issues.push({ title, url: `${url.origin}${url.pathname}`, published: new Date(date).toISOString() });
      }
      item = null;
    }
    stack.pop();
  });
  parser.write(xml).close();

  return [...new Map(issues.map(issue => [issue.url, issue])).values()]
    .sort((left, right) => right.published.localeCompare(left.published))
    .slice(0, 3);
}

export const getIssues = unstable_cache(async () => {
  try {
    const response = await fetch(`${pudLog}/feed`, {
      headers: { Accept: "application/rss+xml", "User-Agent": "pud.dev" },
      signal: AbortSignal.timeout(2200),
    });
    if (response.ok) {
      const issues = readIssues(await response.text());
      if (issues.length) return issues;
    }
  } catch {
    // Keep a verified issue available when the feed is unavailable.
  }
  return [firstIssue];
}, ["pudlog-issues"], { revalidate: 600 });
