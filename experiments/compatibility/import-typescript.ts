import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const revision = "1e4744d68260a7cb91b62b12edc3f6a2187faaf1";
const folder = "tests/cases/conformance";
const checkout = process.argv[2];
if (!checkout) throw new Error("Pass a Microsoft/TypeScript Git checkout containing v7.0.2.");
const listing = execFileSync("git", ["-C", checkout, "ls-tree", "-r", "-z", "--name-only", revision, "--", folder],
  { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const groups: Record<string, number> = {};
for (const path of listing.split("\0")) {
  if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
  const relative = path.slice(folder.length + 1);
  const group = relative.includes("/") ? relative.split("/")[0]! : ".";
  groups[group] = (groups[group] ?? 0) + 1;
}
if (!Object.keys(groups).length) throw new Error("The compiler inventory is empty.");
writeFileSync(join(import.meta.dir, "typescript-inventory.json"), JSON.stringify({ revision, folder, groups }, null, 2) + "\n");
