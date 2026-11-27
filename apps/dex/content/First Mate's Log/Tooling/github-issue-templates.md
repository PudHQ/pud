---
author: codex
date: 2026-11-27
summary: How Pud’s issue chooser and copyable feature spec capture laws and verification plans.
tags: [github, tooling, codex]
---
# GitHub issue templates for Pud

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

The chooser offers Bug report and Feature spec once the files reach the default branch. People with write access can still choose a blank issue. [GitHub’s template chooser rules](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository#configuring-the-template-chooser)

Keep the headings and prompts in the Feature spec form and the Markdown copy in sync. To file from the command line, fill out a copy of the Markdown and pass it to `gh issue create --body-file`. [Feature spec form](https://github.com/PudHQ/pud/blob/main/.github/ISSUE_TEMPLATE/feature-spec.yml) · [Markdown copy](https://github.com/PudHQ/pud/blob/main/.github/feature-spec.md) · [GitHub CLI manual](https://cli.github.com/manual/gh_issue_create)

A spec names the docs to update, the measurements and targets, and the tests to add. It states the input domain and property for each law. For behavior outside Pud’s current model, it records the gap and how to check it. The prompt uses the linear search proof as its example. [[Handbook/Engineering/reading-a-proof-result|Reading a proof result]]
