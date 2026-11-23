import { Suspense } from "react";
import { Newspaper } from "./newspaper";
import { firstIssue, getIssues, type Issue } from "./pud-log";

function LogCard({ displayClass, issue }: { displayClass: string; issue: Issue }) {
  return (
    <a id="news" href={issue.url} target="_blank" rel="noopener noreferrer" title={issue.title}
      aria-labelledby="pud-log-title pud-log-action"
      className="group relative isolate grid min-h-44 grid-cols-2 items-center overflow-hidden bg-paper text-ink
        focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan sm:min-h-56">
      <div className="pointer-events-none absolute inset-y-0 -right-10 -z-10 w-7/12 origin-bottom-right -skew-x-9 bg-vermilion" aria-hidden="true" />
      <div className="min-w-0 py-5 ps-4 sm:ps-7 xl:ps-9">
        <p className="mb-3 flex items-center gap-2 font-mono text-xs font-interface tracking-widest uppercase sm:mb-5">
          <span className="h-px w-4 bg-ink" aria-hidden="true" />
          For now
        </p>
        <h3 id="pud-log-title" className={`${displayClass} text-3xl leading-none lg:text-4xl xl:text-5xl`}>The Pud Log</h3>
        <span id="pud-log-action" className="mt-3 inline-flex items-center gap-1.5 text-xs font-interface underline decoration-ink/40 underline-offset-4
          group-hover:decoration-ink sm:mt-4 sm:text-sm">
          Read on Substack <span aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5">↗</span>
        </span>
      </div>
      <div className="grid min-w-0 justify-items-center pe-2 sm:pe-4">
        <Newspaper />
      </div>
    </a>
  );
}

async function LatestPudLog({ displayClass }: { displayClass: string }) {
  const [issue = firstIssue] = await getIssues();
  return <LogCard displayClass={displayClass} issue={issue} />;
}

export function PudLogLink({ displayClass }: { displayClass: string }) {
  return (
    <Suspense fallback={<LogCard displayClass={displayClass} issue={firstIssue} />}>
      <LatestPudLog displayClass={displayClass} />
    </Suspense>
  );
}
