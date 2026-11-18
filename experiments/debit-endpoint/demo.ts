import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { format } from "./cli.ts";
import { check } from "./lib.ts";

const dir = await mkdtemp(join(tmpdir(), "pud-debit-demo-"));
try {
  const file = join(dir, "handler.ts");
  const original = await readFile(new URL("./handler.ts", import.meta.url), "utf8");
  await writeFile(file, original);
  await copyFile(new URL("./schema.sql", import.meta.url), join(dir, "schema.sql"));
  const baseline = await check(file);
  console.log("Original debit\n" + format({ ...baseline, file: "handler.ts" }));
  if (baseline.status !== "proved") throw new Error("Expected all original transaction contracts to be proved.");

  const guard = "a.tenant_id = r.tenant_id AND ";
  if (!original.includes(guard)) throw new Error("Missing demo tenant condition.");
  await writeFile(file, original.replace(guard, ""));
  const broken = await check(file);
  console.log("\nSame contracts, tenant condition removed\n" + format({ ...broken, file: "handler.ts" }));
  if (broken.status !== "disproved" || broken.counterexample?.observed.balances["birch/primary"] !== "70") {
    throw new Error("Expected a replayed debit to the second tenant's account.");
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
