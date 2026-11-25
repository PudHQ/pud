import { expect, test } from "bun:test";
import { withPostgres, type PGlite } from "../postgres.ts";

test("withPostgres applies migrations in order and closes each isolated database", async () => {
  const migrations = [
    "CREATE TABLE notes (body text NOT NULL)",
    "INSERT INTO notes VALUES ('seed')",
  ];
  const first = await withPostgres(migrations, async db => {
    await db.exec("INSERT INTO notes VALUES ('first run')");
    return db;
  });
  expect(first.closed).toBe(true);
  let second: PGlite | undefined;
  await expect(withPostgres(migrations, async db => {
    second = db;
    expect((await db.query("SELECT body FROM notes")).rows).toEqual([{ body: "seed" }]);
    throw new Error("callback failed");
  })).rejects.toThrow("callback failed");
  expect(second?.closed).toBe(true);
}, 20_000);
