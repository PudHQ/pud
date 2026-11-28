---
author: codex
date: 2026-11-28
summary: Why Pud uses pud.dev on npm, what ships in the tarball, and how npx resolves the installed command.
tags: [cli, npm, packaging, codex]
---
# Choosing an npm name for the Pud command

> [!WARNING]
> This note was written by an LLM. Its content may be hard to read as a result. Feel free to [open a PR](https://github.com/PudHQ/pud/compare) to fix this note. [[First Mate's Log/about-the-first-mates-log#Why keep these notes?|Read more here]] on the rationale behind AI-generated notes.

Pud’s package currently bundles its suite API, the Lean adapter, and one executable named `pud`. In a fresh project, `npx` can take the published package name and infer its single executable. After a local install, `npx pud check` uses the installed command. The executable requires Bun on the path. [Pud’s pack script](https://github.com/PudHQ/pud/blob/main/packages/pud/scripts/pack.ts) · [CLI source](https://github.com/PudHQ/pud/blob/main/packages/pud/src/cli.ts) · [npm exec](https://docs.npmjs.com/cli/commands/npm-exec/)

I tested three package names locally with npm 10.9.4. Each fixture exposed one executable named `pud` and printed its arguments. After installing each fixture in a separate project, both `npx --offline <package-name> check` and `npx --offline pud check` passed `check` to that executable. The three package names were `@pud.dev/lib`, `pud.dev`, and `pudx`.

## How other projects handled the name

- **Biome** documents installing `@biomejs/biome` locally and then running `npx biome check`. An earlier package named `biome` managed environment variables. This is a close match for a tool that teams add to a project and run repeatedly. [Biome quick start](https://biomejs.dev/installation/quick-start/) · [Earlier package manifest](https://registry.npmjs.org/biome/0.2.1)
- **Prisma** moved its CLI from `@prisma/cli` to `prisma` because running `npx prisma` in a fresh project fetched the older Prisma 1 CLI. The client library kept its `@prisma/client` name. [Prisma 2.16 release notes](https://github.com/prisma/orm/releases/tag/2.16.0)
- **Svelte** brought project creation and add-ons under `npx sv` to give users one command to remember. The CLI docs credit the previous owner for transferring the two-letter package name. [CLI announcement](https://svelte.dev/blog/sv-the-svelte-cli) · [Svelte CLI credits](https://svelte.dev/docs/cli/overview#Acknowledgements)
- **Parcel** distributed its first bundler as `parcel-bundler` and switched to `parcel` in v2. An older `parcel` release belonged to a file-server tool. [Migration guide](https://parceljs.org/migration/parcel-1/#package-name) · [Earlier package manifest](https://registry.npmjs.org/parcel/0.0.1)
- **Electron** reported that newcomers guessed `npm install electron` and installed an unrelated package. The team obtained the name from its owner and continued publishing `electron-prebuilt` during the transition. [Electron’s account](https://www.electronjs.org/blog/npm-install-electron/#the-new-name)

Pud secured the unscoped name `pud.dev` on 2026-11-28. This spelling matches the website and gives the bundled Lean adapter the import path `pud.dev/lean`. The bare `pud` has an unpublish record from 2024. [Pud on npm](https://www.npmjs.com/package/pud.dev) · [Registry history for pud](https://registry.npmjs.org/pud)

## What reaches the npm page

Version 0.0.1 contained the source workspace manifest, including three dependencies with `catalog:` version specifiers. The release packer builds a self-contained archive. It copies the package README into the archive root and includes the description, homepage, repository, issue tracker, keywords, and license in the generated manifest. npm uses that README and metadata for the package listing. [0.0.1 registry manifest](https://registry.npmjs.org/pud.dev/0.0.1) · [npm package README documentation](https://docs.npmjs.com/about-package-readme-files/)

I installed the 0.0.2 archive offline in a fresh npm project, copied the three TypeScript blocks from its README, and ran `npx --offline pud check cents.proof.ts`. Lean 4.19.0 returned one `PASS` for the rounding rule. The tag-triggered release workflow also installs the archive offline and proves the clamp example before handing the same archive to the publishing job.
