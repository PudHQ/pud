"use client";

import { useEffect, useRef, useState } from "react";
import { display } from "@/app/fonts";
import { avatarUrl, numberLabel, parseRoster, repository, rosterPath, signupUrl, visibleSupporters } from "./roster";

const readmeUrl = `https://github.com/${repository}#supporters`;
const liveRosterUrl = `https://raw.githubusercontent.com/${repository}/main/${rosterPath}`;
const pageSize = 24;

type Feed = { status: "idle" | "loading" | "error" } | { status: "ready"; members: ReturnType<typeof visibleSupporters>; snapshot: boolean };

async function fetchRoster(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]) });
  if (!response.ok) throw new Error(`Supporter feed returned HTTP ${response.status}.`);
  return visibleSupporters(parseRoster(await response.text()));
}

async function loadFeed(signal: AbortSignal): Promise<Feed> {
  if (!import.meta.env.DEV) {
    try {
      return { status: "ready", members: await fetchRoster(liveRosterUrl, signal), snapshot: false };
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return { status: "ready", members: await fetchRoster("/supporters.json", signal), snapshot: !import.meta.env.DEV };
}

const textLink = "inline-flex min-h-11 items-center rounded-sm font-semibold underline decoration-current/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2";

export function SupporterSection() {
  const section = useRef<HTMLElement>(null);
  const [feed, setFeed] = useState<Feed>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(pageSize);
  const firstNewMember = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (limit > pageSize) firstNewMember.current?.focus();
  }, [limit]);

  useEffect(() => {
    const controller = new AbortController();
    function load() {
      setFeed({ status: "loading" });
      loadFeed(controller.signal).then(result => {
        if (!controller.signal.aborted) setFeed(result);
      }).catch(() => {
        if (!controller.signal.aborted) setFeed({ status: "error" });
      });
    }
    if (attempt > 0 || !window.IntersectionObserver) {
      load();
      return () => controller.abort();
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "160px" });
    if (section.current) observer.observe(section.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [attempt]);

  const members = feed.status === "ready" ? feed.members : [];

  return (
    <section id="supporters" ref={section} aria-labelledby="supporters-title" className="bg-paper px-gutter py-10 text-center text-ink sm:py-12">
      <div className="mx-auto max-w-5xl">
        <h2 id="supporters-title" className={`${display.className} text-3xl leading-none tracking-tight sm:text-4xl`}>Supporters</h2>
        {members.length > 0 && <>
          <ol aria-label="Supporters in signup order" className="mt-6 flex flex-wrap items-start justify-center gap-x-5 gap-y-6">
            {members.slice(0, limit).map(({ id, login, number, href }, index) => (
              <li key={id} value={number} className="w-32 max-w-full odd:-rotate-2 even:rotate-2 hover:rotate-0 focus-within:rotate-0 motion-safe:transition-transform sm:w-36">
                <a href={href} ref={index === limit - pageSize ? firstNewMember : undefined}
                  className="group block rounded-sm bg-white p-1.5 text-start shadow-md ring-1 ring-ink/10 focus-visible:outline-2 focus-visible:outline-offset-4">
                  <img src={avatarUrl(id, 320)} alt="" width="144" height="144" loading="lazy" decoding="async"
                    className="aspect-square w-full rounded-xs bg-paper object-cover" />
                  <span className="flex flex-wrap items-baseline justify-between gap-x-1 px-1 pt-2 pb-1">
                    <span className="text-sm font-bold wrap-anywhere group-hover:underline group-focus-visible:underline">@{login}</span>
                    <span className="font-mono text-xs text-neutral-600 tabular-nums">{numberLabel(number)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
          {members.length > limit && <button type="button" className={`mt-3 text-sm ${textLink}`} onClick={() => setLimit(value => value + pageSize)}>
            Show more supporters ({members.length - limit} remaining)
          </button>}
        </>}
        <div role="status" className="text-sm text-neutral-700">
          {feed.status === "loading" && <span className="sr-only">Loading supporters…</span>}
          {feed.status === "error" && <p className="mt-3">The supporters couldn’t load.{" "}
            <button type="button" className={textLink} onClick={() => setAttempt(value => value + 1)}>Try again</button>
          </p>}
          {feed.status === "ready" && feed.snapshot && <p className="mt-3">Showing a saved copy.{" "}
            <a href={readmeUrl} className={textLink}>View the latest roll</a>
          </p>}
        </div>
        <noscript><p><a href={readmeUrl} className={textLink}>View supporters in the README</a></p></noscript>
        <a href={signupUrl} className={`mt-3 gap-1.5 text-sm ${textLink}`}>
          Add your GitHub profile here! <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}
