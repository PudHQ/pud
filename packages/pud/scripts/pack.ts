import { execFileSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import manifest from "../package.json";

const pud = resolve(import.meta.dir, "..");
const root = resolve(pud, "../..");

/** Ship the notices of every third-party package actually present in the Bun bundle. */
async function writeNotices(files: string[], target: string) {
  const packages = new Set<string>();
  for (const file of files) {
    const parts = resolve(file).split(sep);
    const index = parts.lastIndexOf("node_modules");
    if (index < 0) continue;
    const scoped = parts[index + 1]!.startsWith("@");
    packages.add(parts.slice(0, index + (scoped ? 3 : 2)).join(sep));
  }
  const notices: string[] = [];
  for (const dir of [...packages].sort()) {
    const { name, version } = await Bun.file(join(dir, "package.json")).json();
    const licenses = (await readdir(dir)).filter(n => /^(licen[cs]e|copying|notice)(?:$|[.-])/i.test(n)).sort();
    if (!licenses.length) throw new Error(`Missing license for ${name}@${version}`);
    notices.push(`${name}@${version}`, ...await Promise.all(licenses.map(n => readFile(join(dir, n), "utf8"))));
  }
  await writeFile(target, notices.join("\n\n"));
}

export async function pack(destination = join(root, "dist"), release?: { version: string; gitHead: string }) {
  destination = resolve(destination);
  const stage = await mkdtemp(join(tmpdir(), "pud-pack-"));
  try {
    const build = await Bun.build({
      entrypoints: ["cli.ts", "index.ts", "lean/index.ts", "project-runner.ts"].map(file => join(pud, "src", file)),
      root: join(pud, "src"),
      outdir: stage,
      target: "bun",
      splitting: true,
      metafile: true,
      minify: { whitespace: true },
    });
    if (!build.success) throw new AggregateError(build.logs, "Could not bundle Pud");
    execFileSync(process.execPath, [
      join(root, "node_modules/typescript/bin/tsc"), "-p", join(pud, "tsconfig.pack.json"), "--outDir", join(stage, "types"),
    ], { stdio: "inherit" });
    await writeNotices(Object.keys(build.metafile!.inputs), join(stage, "THIRD-PARTY-NOTICES"));
    await copyFile(join(root, "LICENSE"), join(stage, "LICENSE"));
    await copyFile(join(pud, "README.md"), join(stage, "README.md"));
    await chmod(join(stage, "cli.js"), 0o755);
    const types = "./types/index.d.ts";
    await writeFile(join(stage, "package.json"), JSON.stringify({
      name: manifest.name,
      version: release?.version ?? manifest.version,
      gitHead: release?.gitHead,
      description: manifest.description,
      homepage: manifest.homepage,
      repository: manifest.repository,
      bugs: manifest.bugs,
      keywords: manifest.keywords,
      license: manifest.license,
      type: manifest.type,
      exports: {
        ".": { types, default: "./index.js" },
        "./lean": { types: "./types/lean/index.d.ts", default: "./lean/index.js" },
      }, types,
      bin: { [manifest.name]: "./cli.js" },
    }, null, 2));
    await mkdir(destination, { recursive: true });
    const archive = execFileSync(process.execPath, ["pm", "pack", "--destination", destination, "--quiet"], { cwd: stage, encoding: "utf8" }).trim();
    return resolve(destination, archive);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) console.log(await pack(process.argv[2]));
