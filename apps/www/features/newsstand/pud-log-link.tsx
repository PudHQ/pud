import { Suspense } from "react";
import { Newspaper } from "./newspaper";
import { firstIssue, getIssues, type Issue } from "./pud-log";

const issueDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const awningStripes = Array.from({ length: 15 }, (_, stripe) => stripe);

function Newsstand({ issue }: { issue: Issue }) {
  return (
    <a id="news" href={issue.url} target="_blank" rel="noopener noreferrer" aria-labelledby="pud-log-title pud-log-action"
      className="group/news @container isolate block text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan">
      <div aria-hidden="true" className="relative z-10 flex h-8 drop-shadow-md after:absolute after:inset-x-0 after:bottom-2.5 after:border-t after:border-ink/20 @md:h-11">
        {awningStripes.map(stripe => (
          <span key={stripe} className="flex-1 rounded-b-xl border-b border-ink/30 bg-linear-to-b from-white/20 via-transparent to-ink/20 odd:bg-vermilion even:bg-paper" />
        ))}
      </div>
      <div className="mx-1.5 -mt-2 border-x-4 border-teal-900 bg-teal-950 shadow-xl @md:mx-2 @md:border-x-6">
        <div className="relative isolate overflow-hidden bg-newsstand-back">
          <Newspaper headline={issue.title} />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-1/12 h-1.5 rounded-full border-y border-ink/65
            bg-linear-to-b from-amber-100 via-stone-300 to-stone-500 shadow-md @md:h-2" />
        </div>
        <div aria-hidden="true" className="relative -mx-1.5 h-3 border-y border-ink/75 bg-linear-to-b from-teal-700 via-teal-900 to-teal-950 shadow-md" />
        <div className="flex flex-col items-start gap-3 border-b-4 border-teal-900 bg-paper px-4 py-4 @md:px-6 @lg:flex-row @lg:items-center @lg:justify-between @lg:gap-5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-xs font-semibold tracking-wide uppercase">
              Latest issue <span aria-hidden="true">·</span> <time dateTime={issue.published}>{issueDate.format(new Date(issue.published))}</time>
            </p>
            <h3 id="pud-log-title" className="mt-1 font-serif text-2xl leading-tight font-bold text-pretty wrap-anywhere @md:text-3xl">
              <span className="sr-only">The Pud Log — </span>{issue.title}
            </h3>
          </div>
          <span id="pud-log-action" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-interface underline decoration-ink/40 underline-offset-4
            group-hover/news:decoration-ink group-focus-visible/news:decoration-ink">
            Read on Substack <span aria-hidden="true">↗</span>
          </span>
        </div>
      </div>
    </a>
  );
}

async function LatestPudLog() {
  const [issue = firstIssue] = await getIssues();
  return <Newsstand issue={issue} />;
}

export function PudLogLink() {
  return (
    <Suspense fallback={<Newsstand issue={firstIssue} />}>
      <LatestPudLog />
    </Suspense>
  );
}
