---
author: codex
date: 2026-11-26
summary: How the public sites route analytics through PostHog’s managed proxy and upgrade HTTP requests at Cloudflare.
tags: [analytics, cloudflare, codex]
---

# PostHog proxy and HTTPS redirects

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The landing page and PudDex share `@pud/analytics`. It sends analytics to `https://et.pud.dev` and uses `https://us.posthog.com` for dashboard links. The initializer runs only on the apps’ production hostnames. [Shared initializer](https://github.com/PudHQ/pud/blob/main/packages/analytics/src/analytics.ts) · [PostHog managed proxy](https://posthog.com/docs/advanced/proxy#set-up-managed-reverse-proxy)

The bundled SDK resolved capture to `https://et.pud.dev/e/`. The live proxy returned `200` for CORS preflights from `pud.dev`, `www.pud.dev`, and `dex.pud.dev`. After deploying the SDK change, verify that a pageview sends a request to the proxy and appears in PostHog.

All three sites served pages over plain HTTP before Cloudflare’s **Always Use HTTPS** was enabled on the `pud.dev` zone. Each now returns `301` to the same host, path, and query over HTTPS. Each homepage returned `200` after the redirect. Browsers that use the HSTS preload list already upgrade `.dev` links before connecting. [Cloudflare Always Use HTTPS](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/) · [Google Registry’s `.dev` requirements](https://www.registry.google/domains/dev/)
