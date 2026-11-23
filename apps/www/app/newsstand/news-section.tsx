import { Suspense } from "react";
import { Newspaper } from "./newspaper";
import { firstIssue, getIssues, type Issue } from "./pud-log";

function NewsLink({ displayClass, issue }: { displayClass: string; issue: Issue }) {
  return (
    <a href={issue.url} target="_blank" rel="noopener noreferrer" title={issue.title}
      className="group grid min-h-34 grid-cols-signup items-center gap-3 px-gutter py-2 hover:bg-stone-100
        focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink sm:gap-column-gap">
      <div>
        <h2 id="news-title" className={`${displayClass} text-signup-title leading-none tracking-tight text-pretty phone:text-2xl small-phone:text-xl`}>
          Keep up with the latest news
        </h2>
        <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold underline decoration-ink/40 underline-offset-4 group-hover:decoration-ink">
          Read The Pud Log <span aria-hidden="true">↗</span>
        </span>
      </div>
      <Newspaper />
    </a>
  );
}

async function LiveNewsLink({ displayClass }: { displayClass: string }) {
  const [issue = firstIssue] = await getIssues();
  return <NewsLink displayClass={displayClass} issue={issue} />;
}

export function NewsSection({ displayClass }: { displayClass: string }) {
  return (
    <section id="news" aria-labelledby="news-title" className="bg-paper">
      <Suspense fallback={<NewsLink displayClass={displayClass} issue={firstIssue} />}>
        <LiveNewsLink displayClass={displayClass} />
      </Suspense>
    </section>
  );
}
