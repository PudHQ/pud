---
author: codex
date: 2026-11-27
summary: Deploy a Git branch to Cloudflare Workers and find the Preview URL on its pull request.
tags: [cloudflare, deployment, codex]
---
# Deploying Worker Previews

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Run `bun run deploy:preview:www` or `bun run deploy:preview:dex` from the repository root to deploy the current Git branch as a Cloudflare Worker Preview. Sign in with `bun run --cwd apps/www cf auth login` for manual deployments. Pass `--preview-name <name>` to choose a name explicitly. After a local build, `bun run preview:www` and `bun run preview:dex` serve the built apps on ports 4901 and 4902.

In each Worker's **Settings → Builds → Previews Base**, use the repository root and set the Preview command to the corresponding `bun run deploy:preview:*` command. Leave the Build command blank. The landing site's Vinext command builds Preview output and passes it to `cf previews deploy`. PudDex builds with Astro and passes `dist` to `cf previews deploy`. The Workers Builds checks and the PR comment show the deployment result. [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#preview-command) · [Vinext Worker Previews](https://vinext.dev/docs/deploying/cloudflare#deploy-a-worker-preview)

On the Worker's **Domains** tab, turn on Preview for its `workers.dev` URL so Workers Builds can link to it from the pull request. Both apps set `previewUrls: true` to keep the setting on future deployments. [Preview host configuration](https://developers.cloudflare.com/workers/previews/custom-domains/#enable-workersdev-preview-urls)

Landing-site previews share the `pud-alpha-preview` D1 database for test signups. Apply migrations with `bun run --cwd apps/www cf d1 migrations apply <preview-database-uuid>` from the repository root. [Preview resource isolation](https://developers.cloudflare.com/workers/previews/resources/#select-resources-with-cf)

When PudDex reports that two notes map to one route, check the tracked paths with `git ls-tree -r --name-only HEAD`. Linux Cloudflare runners see case-only duplicates such as `Rockbuster.md` and `rockbuster.md` as separate files. [The original preview failures](https://github.com/PudHQ/pud/issues/15)
