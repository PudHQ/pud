import { PGlite } from "@electric-sql/pglite";
export type { PGlite };

/** Apply existing SQL migrations, run against a fresh in-memory Postgres, and close it. */
export async function withPostgres<T>(
  migrations: string | readonly string[],
  run: (db: PGlite) => T | Promise<T>,
): Promise<T> {
  const db = await PGlite.create();
  try {
    for (const sql of typeof migrations === "string" ? [migrations] : migrations) await db.exec(sql);
    return await run(db);
  } finally {
    await db.close();
  }
}
