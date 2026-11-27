---
author: codex
date: 2026-11-27
updated-at: 2026-11-27
summary: How to join Pud’s supporter roll, keep a number, and refresh the published list.
tags: [github, supporters, codex]
---
# How the supporter roll works

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

How do you join the supporter roll? Leave a comment on the signup issue. Your portrait and handle in the README and on the landing page link to your earliest visible comment on that issue. [Signup issue](https://github.com/PudHQ/pud/issues/17) · [README](https://github.com/PudHQ/pud#supporters) · [Landing page](https://pud.dev/#supporters)

## Keeping your number

The first eligible comment gets #0001. The workflow processes comments in ascending GitHub comment ID order and gives each new account the next number. Additional comments and handle changes keep the same number because the roll tracks GitHub account IDs.

Delete all your signup comments to take your avatar off the roll. Moderators can also hide comments. An account stays listed as long as it has a visible comment. Once the last one disappears, the roster keeps the account ID in its original position and clears the handle. Commenting again restores that number. The roster and its Git history are public. [Roster](https://github.com/PudHQ/pud/blob/main/apps/www/public/supporters.json)

## Refreshing the roll

New and deleted comments on the signup issue trigger a full scan. A daily scan picks up moderation, account renames and missed events. Maintainers can run **Actions → Update supporter roll → Run workflow** on `main` to refresh it sooner. The workflow reads all comment pages and updates the roster and the marked README block in one commit. If another commit lands first, it rereads the branch and retries. Preserve the two `supporters` markers when editing the README. [Workflow](https://github.com/PudHQ/pud/blob/main/.github/workflows/supporters.yml) · [GitHub commit precondition](https://docs.github.com/en/graphql/reference/commits#createcommitonbranchinput)

The landing page fetches the published roster when the section approaches the viewport. New signups appear once GitHub’s raw-file cache refreshes. If the request fails, the page labels the copy from the last site build. Local development reads `apps/www/public/supporters.json` directly. [[Handbook/Engineering/deploying-worker-previews|Deploying Worker Previews]]
