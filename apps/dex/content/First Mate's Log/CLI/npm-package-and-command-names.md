---
author: codex
date: 2026-11-28
updated-at: 2026-11-28
summary: How the npm package, command, and TypeScript imports share the pud.dev name.
tags: [cli, npm, packaging, codex]
---
# Choosing an npm name for the Pud command

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

From version 0.0.3, the npm package and its single executable share the name `pud.dev`. With Bun on the path, run `npx pud.dev --help` before installing it. In a project, install with `bun add -d pud.dev`, import the suite API from `pud.dev` and the bundled adapter from `pud.dev/lean`, and run `npx pud.dev check`. [Package and command](https://github.com/PudHQ/pud/blob/main/packages/pud/package.json) · [npm exec](https://docs.npmjs.com/cli/commands/npm-exec/)

In the original naming trial with npm 10.9.4, all three local fixtures exposed one executable. When the fixture was installed, npm could resolve it by either its package name or its executable name. Matching the two names gives first-time and returning users the same command.

## How other projects handled the name

- **Biome** documents installing `@biomejs/biome` locally and then running `npx biome check`. An earlier package named `biome` managed environment variables. This is a close match for a tool that teams add to a project and run repeatedly. [Biome quick start](https://biomejs.dev/installation/quick-start/) · [Earlier package manifest](https://registry.npmjs.org/biome/0.2.1)
- **Prisma** moved its CLI from `@prisma/cli` to `prisma` because running `npx prisma` in a fresh project fetched the older Prisma 1 CLI. The client library kept its `@prisma/client` name. [Prisma 2.16 release notes](https://github.com/prisma/orm/releases/tag/2.16.0)
- **Svelte** brought project creation and add-ons under `npx sv` to give users one command to remember. The CLI docs credit the previous owner for transferring the two-letter package name. [CLI announcement](https://svelte.dev/blog/sv-the-svelte-cli) · [Svelte CLI credits](https://svelte.dev/docs/cli/overview#Acknowledgements)
- **Parcel** distributed its first bundler as `parcel-bundler` and switched to `parcel` in v2. An older `parcel` release belonged to a file-server tool. [Migration guide](https://parceljs.org/migration/parcel-1/#package-name) · [Earlier package manifest](https://registry.npmjs.org/parcel/0.0.1)
- **Electron** reported that newcomers guessed `npm install electron` and installed an unrelated package. The team obtained the name from its owner and continued publishing `electron-prebuilt` during the transition. [Electron’s account](https://www.electronjs.org/blog/npm-install-electron/#the-new-name)

Pud secured the unscoped name `pud.dev` on 2026-11-28. This spelling matches the website and gives the bundled Lean adapter the import path `pud.dev/lean`. The bare `pud` has an unpublish record from 2024. [Pud on npm](https://www.npmjs.com/package/pud.dev) · [Registry history for pud](https://registry.npmjs.org/pud)

## What reaches the npm page

Version 0.0.1 contained the source workspace manifest, including three dependencies with `catalog:` version specifiers. The release packer builds a self-contained archive. It copies the package README into the archive root and includes the description, homepage, repository, issue tracker, keywords, and license in the generated manifest. npm uses that README and metadata for the package listing. [0.0.1 registry manifest](https://registry.npmjs.org/pud.dev/0.0.1) · [npm package README documentation](https://docs.npmjs.com/about-package-readme-files/)

I installed the 0.0.2 archive offline in a fresh npm project, copied the three TypeScript blocks from its README, and checked the rounding sidecar with its installed executable. Lean 4.19.0 returned one `PASS` for the rounding rule. A maintainer dispatches the release workflow with a version. It installs the archive offline, proves the clamp example, and publishes that archive to npm and the tagged GitHub release. [Release workflow](https://github.com/PudHQ/pud/blob/main/.github/workflows/publish-npm.yml)
