# Pud landing site

The public landing page at `pud.dev` uses Vinext for server rendering and stores alpha signups in Cloudflare D1.

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run dev:www` from the root. The dev server applies local D1 migrations on startup. The form saves one entry per email address in the `alpha_signups` table. Run `bun run alpha:list` from the root to read the local list.

## Release

For the first production release, use the existing `pud-alpha` database or create it with `bun run --cwd apps/www cf d1 create --name pud-alpha`. Apply migrations with `bun run --cwd apps/www cf d1 migrations apply <database-uuid>`, then run `bun run deploy:www` from the root. Apply new migrations the same way on later releases.

Open `pud-alpha` in the D1 dashboard and browse the `alpha_signups` table in Studio to see the production list. [Cloudflare D1 dashboard](https://dash.cloudflare.com/?to=/:account/workers/d1)
