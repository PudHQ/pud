---
name: workflow-general
description: Follow Pud’s conventions for GitHub issues, branches, commits, and pull requests, including UI screenshots.
---

# Development workflow

This note describes how to work within the Pud monorepo.

## Issue authoring

In general, GitHub issues for feature requests should be authored by a human, especially if that author is an outside contributor or collaborator. Bug reports can be authored by anyone or any system given that the bug is relevant and valid.

Use an issue template when opening an issue and try to fill in as much of it as seems expected and reasonable.

## Picking up issues

If a human provides you with an issue link in the chat, that's your cue to:

- Read all of its contents, twice
- Internalise what is being asked
- Ask clarifying questions
- Begin the work

If **any** of the following things are not true when a human passes you a Pud issue URL without any other supplementary context:

- Brand new chat
- Using github worktrees

Then ask the user to clarify what they want you to do with that issue URL.

## Branches

All new issue work should be done on a new branch per issue, in the following format:

`<username | agent name>/issue-NN-slug`

## During your work

For the lifecycle of your work and change, you _must_ run the dev servers for the various apps you are using IF NEEDED (only if needed), and provide your human with handy links in your output messages to open these locally hosted apps themselves such that they can verify your ongoing and finished work.

## Committing your work

Your work should be committed on a reasonable cadence. Do not interrupt your human with commit issues unless you cannot work around them.

You must not push work that does not pass the repository checks, and must only push work that you -- in good faith -- think meets the high standard of work commanded by Pud's projects.

## Opening a PR

Once you're finished with your work, it's your responsibility to open a Pull Request. You should not ask a human permission to open a PR -- you should do this _before_ claiming that you've finished your work.

PRs at Pud are fluid. You open one (a real one, not a draft) once you're reasonably happy you're done with the work. Then, as your human gives you feedback, you update that PR until you're ready to merge it.

Merging is only ever done by a human Pud maintainer -- for now! (Open an issue about it if you think agents should be allowed to do this too! I'm open to it...)

### Screenshots for UI changes

For every user-visible UI change, the PR author must capture screenshots and embed them as GitHub attachments under `### Screenshots` in the PR’s Verification section. This applies to humans and agents. Frame the changed screen or component, use descriptive alt text, and capture the viewport or interaction states needed to show the change. Include before and after views when the comparison helps reviewers.

With GitHub CLI 2.99 or later and write access to Pud, put the local image path in the PR body file and pass that same path to `--attach`. GitHub CLI uploads the image and replaces the local path in the published description. [GitHub CLI attachment guide](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli)

```markdown
### Screenshots

![Desktop view of the GitHub star button after it charges](/tmp/star-button.png)
```

```sh
gh pr create --title "Update the GitHub star button" --body-file /tmp/pr.md --attach /tmp/star-button.png
```

For an existing PR, use `gh pr edit PR_NUMBER --body-file /tmp/pr.md --attach /tmp/star-button.png` with the full PR description. You can also drop the screenshot into the PR description in GitHub’s web editor. Check that each image renders in the published PR. [GitHub web attachment guide](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)
