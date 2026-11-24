import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolchain = readFileSync(new URL("./lean-toolchain", import.meta.url), "utf8").trim();
const checkoutElan = fileURLToPath(new URL("../../../../.cache/elan", import.meta.url));
const extension = process.platform === "win32" ? ".exe" : "";
const elanVersion = "v4.4.0";

// https://github.com/leanprover/elan/releases/tag/v4.4.0
const releases: Record<string, { archive: string; sha256: string }> = {
  "darwin-arm64": { archive: "aarch64-apple-darwin.tar.gz", sha256: "27af24edeace839730e8c9119783f12d5f694327d4771605021ca09db1ab0a87" },
  "darwin-x64": { archive: "x86_64-apple-darwin.tar.gz", sha256: "a5123096d662216ceaf69d68d6bbabb118c024d20d270bf0d639a830dd4ff97e" },
  "linux-arm64": { archive: "aarch64-unknown-linux-gnu.tar.gz", sha256: "45cde3006f82f98804c94cf2ca4949d117060a5f3cc8afa62f523759947ee21f" },
  "linux-x64": { archive: "x86_64-unknown-linux-gnu.tar.gz", sha256: "0e8250aa2be86c7af929ade68db617af9edc8b9ccf6eaf5ece228250d0d032e2" },
  "win32-x64": { archive: "x86_64-pc-windows-msvc.zip", sha256: "63f50605424284927799702347e2bdbd99d017b9d80ae083c65ee2189c4caf75" },
};

function shim(home: string, name: "lean" | "elan") {
  return join(home, "bin", name + extension);
}

function elanEnv(home: string) {
  return { ...process.env, ELAN_HOME: home, ELAN_TOOLCHAIN: toolchain };
}

export function leanCommand() {
  const userElan = resolve(process.env.ELAN_HOME || join(homedir(), ".elan"));
  const env: NodeJS.ProcessEnv = { ...process.env, ELAN_TOOLCHAIN: toolchain };
  if (process.env.ELAN_HOME) env.ELAN_HOME = userElan;

  const localShim = shim(checkoutElan, "lean");
  const override = process.env.PUD_LEAN;
  if (override) {
    const binary = /[/\\]/.test(override) ? resolve(override) : Bun.which(override) ?? override;
    return { binary, env: binary === localShim ? elanEnv(checkoutElan) : env };
  }

  if (Bun.which(localShim)) return { binary: localShim, env: elanEnv(checkoutElan) };

  const binary = Bun.which("lean") ?? Bun.which(shim(userElan, "lean")) ?? "lean";
  return { binary, env };
}

async function run(binary: string, args: string[], env = process.env) {
  const child = Bun.spawn([binary, ...args], { env, stdout: "inherit", stderr: "inherit" });
  const exit = await child.exited;
  if (exit !== 0) throw new Error(`${basename(binary)} exited with status ${exit}.`);
}

async function selectToolchain(home: string) {
  await run(shim(home, "elan"), ["default", toolchain], elanEnv(home));
  await run(shim(home, "lean"), ["--version"], elanEnv(home));
}

function hasElan(home: string) {
  return Boolean(Bun.which(shim(home, "elan")) && Bun.which(shim(home, "lean")));
}

async function setupLean() {
  if (hasElan(checkoutElan)) {
    await selectToolchain(checkoutElan);
    return;
  }

  const platform = `${process.platform}-${process.arch}`;
  const release = releases[platform];
  if (!release) throw new Error(`Elan has no bundled installer for ${platform}. Set PUD_LEAN to a working Lean executable for the demo.`);

  const cache = dirname(checkoutElan);
  await mkdir(cache, { recursive: true });
  const stage = await mkdtemp(join(cache, ".elan-install-"));
  try {
    const archive = join(stage, `elan-${release.archive}`);
    const stagedHome = join(stage, "elan-home");
    console.log(`Installing Elan ${elanVersion} and ${toolchain} in .cache/elan`);
    const response = await fetch(`https://github.com/leanprover/elan/releases/download/${elanVersion}/${basename(archive)}`, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Elan download returned HTTP ${response.status}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== release.sha256) throw new Error("Elan release checksum mismatch.");
    await writeFile(archive, bytes);
    await run("tar", ["-xf", archive, "-C", stage]);
    await run(join(stage, `elan-init${extension}`), ["-y", "--no-modify-path", "--default-toolchain", "none"], elanEnv(stagedHome));
    await selectToolchain(stagedHome);
    try {
      await rename(stagedHome, checkoutElan);
    } catch (error) {
      if (!hasElan(checkoutElan)) throw error;
      await selectToolchain(checkoutElan);
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try { await setupLean(); }
  catch (error) {
    console.error(`Lean setup failed. ${(error as Error).message}`);
    process.exitCode = 1;
  }
}
