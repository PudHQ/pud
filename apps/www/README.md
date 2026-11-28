# Pud landing site

The public landing page at `pud.dev` uses Vinext for server rendering and stores alpha signups in Cloudflare D1.

## Development

Follow the [workspace setup](../../README.md#workspace) and run `bun run dev:www` from the root. The [editions gallery](http://localhost:4901/editions) opens on ten illustrated, interactive proof exhibits. [The previous collection](http://localhost:4901/editions?round=3) holds the ten tactile hero studies. The other rounds have their own collection links. Every edition has a direct URL. The arrows stay within the selected round, and all rounds share a local shortlist.

The dev server applies local D1 migrations on startup. The form saves one entry per email address in the `alpha_signups` table. Run `bun run alpha:list` from the root to read the local list.

## Source layout

[The home route](app/page.tsx) sets the section order, header and footer. [The root layout](app/layout.tsx) supplies the shared stylesheet. The [edition catalog](features/editions/catalog.ts) orders the gallery and its previous and next links.

- [Components](components) holds site navigation and the scene primitives shared by the terminal and newspaper.
- [Features](features) holds the home sections, GitHub spotlight, PudDex terminal, newsstand, waitlist and [supporter roll](../dex/content/Handbook/Engineering/supporter-roll.md). The Dex scene groups the factory and office models separately.
- [Library](lib) holds analytics and site addresses. The local terminal and proof walkthrough use PudDex on port 4902.

## Release

For the first production release, use the existing `pud-alpha` database or create it with `bun run --cwd apps/www cf d1 create --name pud-alpha`. Apply migrations with `bun run --cwd apps/www cf d1 migrations apply <database-uuid>`, then run `bun run deploy:www` from the root. Apply new migrations the same way on later releases.

Open `pud-alpha` in the D1 dashboard and browse the `alpha_signups` table in Studio to see the production list. [Cloudflare D1 dashboard](https://dash.cloudflare.com/?to=/:account/workers/d1)
