import { execFileSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import manifest from "../package.json";
import model from "../../model/package.json";

const cli = resolve(import.meta.dir, "..");
const root = resolve(cli, "../..");

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

async function declarations(stage: string) {
  const out = join(stage, "types");
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(cli, "tsconfig.pack.json"), "--outDir", out], { stdio: "inherit" });
  // The installed archive owns the model. Point its declarations at the same
  // private copy so editor types never depend on a workspace package.
  for await (const file of new Bun.Glob("**/*.d.ts").scan({ cwd: join(out, "cli"), absolute: true })) {
    let source = await readFile(file, "utf8");
    for (const [key, path] of Object.entries(model.exports)) {
      const specifier = key.replace(".", model.name);
      const local = relative(dirname(file), join(out, "model", path)).split(sep).join("/").replace(/\.ts$/, ".js");
      source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(local));
    }
    await writeFile(file, source);
  }
}

export async function pack(destination = join(root, "dist")) {
  destination = resolve(destination);
  const stage = await mkdtemp(join(tmpdir(), "pud-pack-"));
  try {
    const build = await Bun.build({
      entrypoints: [join(cli, "src/cli.ts"), join(cli, "src/index.ts")],
      root: join(cli, "src"),
      outdir: stage,
      target: "bun",
      splitting: true,
      metafile: true,
      minify: { whitespace: true },
    });
    if (!build.success) throw new AggregateError(build.logs, "Could not bundle Pud");
    await declarations(stage);
    await writeNotices(Object.keys(build.metafile!.inputs), join(stage, "THIRD-PARTY-NOTICES"));
    await copyFile(join(root, "LICENSE"), join(stage, "LICENSE"));
    await chmod(join(stage, "cli.js"), 0o755);
    const types = "./types/cli/src/index.d.ts";
    await writeFile(join(stage, "package.json"), JSON.stringify({
      name: manifest.name, version: manifest.version, type: "module", license: "MIT",
      exports: { ".": { types, default: "./index.js" } }, types,
      bin: { pud: "./cli.js" },
    }, null, 2));
    await mkdir(destination, { recursive: true });
    const archive = execFileSync(process.execPath, ["pm", "pack", "--destination", destination, "--quiet"], { cwd: stage, encoding: "utf8" }).trim();
    return resolve(destination, archive);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) console.log(await pack(process.argv[2]));
