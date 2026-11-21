import { expect, test } from "bun:test";
import type { PGlite } from "@pud/postgres";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withPostgres } from "../lib.ts";

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

test.skipIf(process.platform === "win32")("a version-only Dafny installation gives one actionable setup error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pud-incomplete-dafny-"));
  try {
    const binary = join(dir, "dafny");
    await writeFile(binary, `#!/bin/sh
if [ "$1" = "--version" ]; then echo "4.11.0"; exit 0; fi
echo "Encountered internal compilation exception: Could not find DafnyPrelude.bpl"
echo "   at Microsoft.Dafny.BoogieGenerator.ReadPrelude()"
exit 4
`, { mode: 0o755 });
    const demo = Bun.fileURLToPath(new URL("../demo.ts", import.meta.url));
    const result = spawnSync(process.execPath, [demo], {
      env: { ...process.env, DAFNY: binary, NO_COLOR: "1" }, encoding: "utf8", timeout: 20_000,
    });
    expect(result.status).toBe(2);
    const log = result.stdout + result.stderr;
    expect(log).toContain("ERROR");
    expect(log).toContain("DafnyPrelude.bpl");
    expect(log).toContain("Fix DAFNY or unset it");
    expect(log).not.toContain("at Microsoft.");
    expect(log).not.toContain("Expected all original transaction contracts");
    expect(log).not.toContain("2/2 scenarios matched");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}, 25_000);
