---
name: gitops
description: Offer to stage the task’s changes at the end of repository work and stage them safely in a shared Git checkout.
---

# Git operations

### No rebases

Rebases are generally not allowed, you must always pull work from `main` without rebasing and use merge commits and maintain linear history wherever possible. Force pushes are generally considered repo-hostile behaviour

### On main? Ask to stage always...

IF YOU ARE WORKING ON MAIN THE FOLLOWING APPLIES...

At the end of each task that changes repository files, ask Rory whether he’d like you to stage the files you worked on so he can commit them. When he has already requested staging for those changes, stage them and report what is ready.

Check `git status --short` and `git diff --cached` before staging. Use explicit paths for your task. For a file with edits from concurrent work, stage only your hunks. Review the staged diff afterward and preserve changes others already staged.
