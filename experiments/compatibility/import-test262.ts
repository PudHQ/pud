import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const revision = "4db99ac4dc8924279ae07ed3246385924e878519";
export const directory = join(import.meta.dir, "test262");

export function importSuite(checkout: string) {
  const git = (...args: string[]) => execFileSync("git", ["-C", checkout, ...args], { maxBuffer: 24 * 1024 * 1024 });
  const listing = git("ls-tree", "-r", "-z", revision, "--", "test").toString().split("\0").filter(Boolean);
  const groups: Record<string, number> = {};
  const files: { path: string; blob: string }[] = [];
  mkdirSync(directory, { recursive: true });
  for (const line of listing) {
    const [object, path] = line.split("\t");
    if (!path?.endsWith(".js") || path.endsWith("_FIXTURE.js")) continue;
    const parts = path.split("/").slice(1, -1);
    const depth = parts[0] === "language" && ["statements", "expressions"].includes(parts[1]!) ? 3 : 2;
    const group = parts.slice(0, depth).join("/");
    groups[group] = (groups[group] ?? 0) + 1;
    if (!/^test\/language\/expressions\/[^/]+\/bigint-arithmetic\.js$/.test(path)) continue;
    const blob = object!.split(" ")[2]!;
    files.push({ path, blob });
    writeFileSync(join(directory, parts[2] + ".js"), git("cat-file", "blob", blob));
  }
  if (!files.length) throw new Error("The pinned Test262 selection is empty.");
  writeFileSync(join(directory, "LICENSE"), git("show", revision + ":LICENSE"));
  writeFileSync(join(directory, "inventory.json"), JSON.stringify({ revision, files, groups }, null, 2) + "\n");
}

if (import.meta.main) {
  if (process.argv.length !== 3) throw new Error("Pass a Test262 Git checkout containing the pinned revision.");
  importSuite(process.argv[2]!);
}
