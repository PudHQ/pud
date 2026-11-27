---
author: codex
date: 2026-11-27
updated-at: 2026-11-27
summary: How Pud’s GitHub templates capture feature specs, proof laws, and verification evidence, including UI screenshots.
tags: [github, tooling, codex]
---
# GitHub issue and pull request templates for Pud

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The chooser offers Bug report and Feature spec once the files reach the default branch. People with write access can still choose a blank issue. [GitHub’s template chooser rules](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#configuring-the-template-chooser)

Keep the headings and prompts in the Feature spec form and the Markdown copy in sync. To file from the command line, fill out a copy of the Markdown and pass it to `gh issue create --body-file`. [Feature spec form](https://github.com/PudHQ/pud/blob/main/.github/ISSUE_TEMPLATE/feature-spec.yml) · [Markdown copy](https://github.com/PudHQ/pud/blob/main/.github/feature-spec.md) · [GitHub CLI manual](https://cli.github.com/manual/gh_issue_create)

A spec names the docs to update, the measurements and targets, and the tests to add. It states the input domain and property for each law. For behavior outside Pud’s current model, it records the gap and how to check it. The prompt uses the linear search proof as its example. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]

## Pull requests

GitHub prepopulates one shared Markdown template for PRs. The verification section connects the key acceptance criteria to the commands and results or to a CI run. For affected Pud laws, include the law, input domain, proof sidecar, and verdict or fallback check. [Pud’s PR template](https://github.com/PudHQ/pud/blob/main/.github/pull_request_template.md) · [GitHub’s PR template guide](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)

Every UI PR includes focused screenshots from its author under **Verification → Screenshots**. Upload them as GitHub attachments in the PR description. GitHub CLI can upload local files when the author has write access to Pud. The GitHub web editor also accepts image uploads. [PR screenshot workflow](https://github.com/PudHQ/pud/blob/main/skills/engineering/devops/workflow-general.md#screenshots-for-ui-changes) · [Issue #9](https://github.com/PudHQ/pud/issues/9)

Use `Closes #ISSUE_NUMBER` in the description for a Pud issue the PR resolves. For PRs targeting `main`, Actions checks GitHub’s resolved closing links for an issue in this repository and reruns on edits to the description. GitHub interprets closing keywords on PRs targeting the default branch. [Issue-link workflow](https://github.com/PudHQ/pud/blob/main/.github/workflows/pull-request.yml) · [GitHub’s issue-linking rules](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)
