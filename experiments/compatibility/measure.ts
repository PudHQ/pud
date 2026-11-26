import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { leanAdapter } from "../../packages/pud/src/lean/index.ts";
import { leanCommand } from "../../packages/pud/src/lean/command.ts";
import { measureArithmetic } from "./arithmetic.ts";
import { checkControl, measureProjects } from "./drop-in.ts";
import { domains, profile, projects } from "./projects.ts";
import inventory from "./test262/inventory.json";

const root = resolve(import.meta.dir, "../..");
const baselineFile = "experiments/compatibility/baseline.json";

async function measure() {
  const { packageManager } = await Bun.file(join(root, "package.json")).json();
  if (packageManager !== "bun@" + Bun.version) throw new Error("Use the pinned " + packageManager + " to run this benchmark.");
  const examples = join(root, "packages/pud/.examples");
  const toolchain = (await readFile(join(examples, "lean-toolchain"), "utf8")).trim();
  const command = leanCommand({ file: join(examples, "clamp.ts"), name: "clamp", source: "" }, { toolchain });
  const expectedVersion = toolchain.split(":v")[1];
  const version = execFileSync(command.binary, ["--version"], { env: command.env, encoding: "utf8" });
  if (!expectedVersion || !version.includes("version " + expectedVersion + ",")) throw new Error("Unexpected Lean version: " + version);
  const cohort = createHash("sha256").update(JSON.stringify([domains, projects, inventory.revision, inventory.files])).digest("hex");
  const temp = await mkdtemp(join(tmpdir(), "pud-compatibility-"));
  try {
    const adapter = leanAdapter({ toolchain });
    await checkControl(temp, adapter);
    const dropIn = await measureProjects(temp, join(root, ".cache/compatibility"), adapter);
    const arithmetic = await measureArithmetic(temp, command);
    return { profile, cohort, bun: Bun.version, lean: expectedVersion, test262: inventory.revision, dropIn, arithmetic };
  } finally { await rm(temp, { recursive: true, force: true }); }
}

export type Snapshot = Awaited<ReturnType<typeof measure>>;

export function checkProgress(before: Snapshot, after: Snapshot) {
  if (before.cohort !== after.cohort) {
    if (before.profile === after.profile) throw new Error("Version the pilot when changing its projects, laws, or upstream test selection.");
    return;
  }
  if (before.dropIn.length !== after.dropIn.length || before.arithmetic.length !== after.arithmetic.length) {
    throw new Error("Missing or extra results for the same cohort.");
  }
  for (const old of before.dropIn) {
    const next = after.dropIn.find(row => row.project === old.project && row.name === old.name);
    if (!next || (!old.admission && next.admission) || (old.verdict === "proved" && next.verdict !== "proved")) {
      throw new Error("Drop-in regression: " + old.project + "/" + old.name);
    }
  }
  for (const old of before.arithmetic) {
    const next = after.arithmetic.find(row => row.operator === old.operator);
    if (!next || old.assertions !== next.assertions || next.unsupported.some(id => !old.unsupported.includes(id))) {
      throw new Error("Test262 regression or missing assertions: " + old.operator);
    }
  }
}

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => flag !== "--update" && flag !== "--json")) throw new Error("Use --update or --json.");
  const actual = await measure();
  const path = join(root, baselineFile);
  const rendered = JSON.stringify(actual, null, 2) + "\n";
  const before = await Bun.file(path).exists() ? await readFile(path, "utf8") : "";
  if (before) checkProgress(JSON.parse(before), actual);
  const base = process.env.PUD_COMPAT_BASE;
  if (base) {
    if (!/^[a-f0-9]{40}$/.test(base)) throw new Error("PUD_COMPAT_BASE must be a full commit hash.");
    if (base !== "0".repeat(40) && execFileSync("git", ["ls-tree", base, "--", baselineFile], { cwd: root }).length) {
      checkProgress(JSON.parse(execFileSync("git", ["show", base + ":" + baselineFile], { cwd: root, encoding: "utf8" })), actual);
    }
  }
  const proved = actual.dropIn.filter(row => row.verdict === "proved").length;
  const passed = actual.arithmetic.filter(row => row.unsupported.length === 0).length;
  if (flags.includes("--json")) process.stdout.write(rendered);
  else console.log("Drop-in laws " + proved + "/" + actual.dropIn.length + " · Test262 bigint arithmetic files " + passed + "/" + actual.arithmetic.length);
  if (before === rendered) return;
  if (!flags.includes("--update")) throw new Error("Measured results differ from the checked-in snapshot. Run bun run compat:update and review the diff.");
  const pending = path + "." + randomUUID();
  try { await writeFile(pending, rendered); await rename(pending, path); }
  finally { await rm(pending, { force: true }); }
}

if (import.meta.main) await main();
