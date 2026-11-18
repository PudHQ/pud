# Alpha signups

The form saves one entry per email address in the D1 table `alpha_signups`. The local server applies the SQL migrations on startup. Run `bun run alpha:list` from this directory to read the local list.

For the first production release, create the database with `bunx cf d1 create --name pud-alpha` or use the existing database of that name. From this directory, run `bunx cf d1 migrations apply <database-uuid>` before `bun run deploy`. Apply new migrations the same way on later releases.

Open `pud-alpha` in the D1 dashboard and browse the `alpha_signups` table in Studio to see the production list. [Cloudflare D1 dashboard](https://dash.cloudflare.com/?to=/:account/workers/d1)
