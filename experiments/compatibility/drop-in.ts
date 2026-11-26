import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { check, type ProofAssistant } from "../../packages/pud/src/index.ts";
import { Unsupported } from "../../packages/pud/src/assistant.ts";
import { domains, projects, schemaFor, type Project, type Target } from "./projects.ts";

function sha256(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }

async function archive(project: Project, cache: string) {
  const path = join(cache, project.sha256 + ".tar.gz");
  if (await Bun.file(path).exists()) {
    if (sha256(await readFile(path)) !== project.sha256) throw new Error("Damaged archive at " + path);
    return path;
  }
  const url = "https://codeload.github.com/" + project.repo + "/tar.gz/" + project.revision;
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error("Could not fetch " + url + " (" + response.status + ")");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (sha256(bytes) !== project.sha256) throw new Error("Archive digest differs for " + url);
  const pending = path + "." + randomUUID();
  try { await writeFile(pending, bytes); await rename(pending, path); }
  finally { await rm(pending, { force: true }); }
  return path;
}

function subjectImport(target: Target) { return 'import { ' + target.name + ' as target } from "../' + target.file + '";'; }

function sidecar(binding: string, title: string, inputs: Target["inputs"]) {
  const schemas = inputs.map(([name, domain]) => name + ": " + schemaFor(domains[domain])).join(", ");
  const parameters = inputs.map(([name]) => name).join(", ");
  return [
    'import { describe, it, expect, pud } from "@pud.dev/lib";', binding,
    "describe(observe, () => {", "  it(" + JSON.stringify(title) + ", { " + schemas + " }, ({ " + parameters + " }) => {",
    "    expect(observe(" + parameters + ")).to(pud.boolean().eq(true));", "  });", "});",
  ].join("\n");
}

export async function checkControl(temp: string, adapter: ProofAssistant) {
  const subject = join(temp, "control.ts"), suite = join(temp, "control.proof.ts");
  await writeFile(suite, sidecar('import { observe } from "./control.ts";', "negating a bigint reverses its order around zero", [["n", "bigint"]]));
  for (const [operation, expected] of [["-n", "proved"], ["n", "unproved"]]) {
    await writeFile(subject, "export function observe(n: bigint): boolean { return (" + operation + " > 0n) === (n < 0n); }");
    const { results } = await check(suite, { adapter });
    if (results.length !== 1 || results[0]?.status !== expected) throw new Error("Broken proof control: " + JSON.stringify(results));
  }
}

export async function measureProjects(temp: string, cache: string, adapter: ProofAssistant) {
  await mkdir(cache, { recursive: true });
  const rows = [];
  for (const project of projects) {
    const root = realpathSync(await mkdtemp(join(temp, "checkout-")));
    const compressed = await archive(project, cache);
    const extract = Bun.spawnSync(["tar", "-xzf", compressed, "--strip-components=1", "-C", root]);
    if (!extract.success) throw new Error("Could not unpack " + project.repo + ": " + extract.stderr);
    const pilot = join(root, ".pud-compatibility-pilot");
    await mkdir(pilot);
    for (const target of project.targets) {
      const fileName = target.name + "-law.ts", prop = join(pilot, target.name + ".proof.ts");
      const signature = target.inputs.map(([name, domain]) => name + ": " + domains[domain].type).join(", ");
      const source = [subjectImport(target), target.extraImport ?? "",
        "export " + (target.async ? "async " : "") + "function observe(" + signature + "): " + (target.async ? "Promise<boolean>" : "boolean") + " {",
        "  " + target.body, "}"];
      await writeFile(join(pilot, fileName), source.join("\n"));
      const binding = 'import { observe } from "./' + fileName + '";';
      const native = join(pilot, "native.ts");
      // Only in-domain native controls can witness that this law admits distinct input tuples.
      const controls = target.controls.map(args => "[" + args + "]");
      const nativeChecks = target.inputs.map(([, domain], i) =>
        "admits(domains[" + JSON.stringify(domain) + "], args[" + i + "])");
      await writeFile(native, [binding, 'import { admits, domains } from ' + JSON.stringify(import.meta.resolve("./projects.ts")) + ";", "const controls = [" + controls.join(", ") + "];",
        "if (!controls.some(args => args.some((v, i) => !Object.is(v, controls[0][i])))) throw new Error('Identical controls');",
        "for (const args of controls) {",
        "  if (args.length !== " + target.inputs.length + " || !(" + nativeChecks.join(" && ") + ")) throw new Error('Control outside the law domain');",
        "  if (await observe(...args) !== true) throw new Error('Native law failed at ' + args.map(String).join(', '));",
        "}"].join("\n"));
      const run = Bun.spawnSync([process.execPath, "--no-install", native], { cwd: root, env: { ...process.env, TZ: "UTC" }, timeout: 30_000 });
      if (!run.success) throw new Error(project.repo + "/" + target.name + " native fixture failed:\n" + run.stderr);

      const file = join(root, target.file);
      let admission: string | null = null;
      try {
        await adapter.prepare({ file, source: readFileSync(file, "utf8"), name: target.name,
          readModule(path) { const canonical = realpathSync(path); return { canonical, source: readFileSync(canonical, "utf8") }; } });
      } catch (error) {
        if (!(error instanceof Unsupported)) throw error;
        admission = error.message.replaceAll(root + "/", "");
      }
      await writeFile(prop, sidecar(binding, target.law, target.inputs));
      const { results } = await check(prop, { adapter });
      const result = results[0];
      if (results.length !== 1 || !result || result.status === "error" || result.status === "todo") {
        throw new Error("Invalid run for " + target.name + ": " + JSON.stringify(results));
      }
      if (result.concreteScope) throw new Error("A pilot law needs varying inputs: " + target.name);
      if (result.status === "proved" && admission) throw new Error("A rejected target received a proof: " + target.name);
      rows.push({ project: project.repo, name: target.name, native: true, admission, verdict: result.status,
        ...(result.status === "unsupported" && { detail: result.detail?.replaceAll(root + "/", "") }) });
    }
  }
  return rows;
}
