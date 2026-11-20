import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const version = "4.11.0";
const platform = `${process.platform}-${process.arch}`;
const executable = process.platform === "win32" ? "dafny.exe" : "dafny";
const cache = fileURLToPath(new URL(`../.cache/dafny/${version}/${platform}/`, import.meta.url));

// SHA-256 digests published with the official v4.11.0 release assets.
const releases: Record<string, { suffix: string; digest: string }> = {
  "darwin-arm64": { suffix: "arm64-macos-13", digest: "c90c75e7d5db9c6ccbb7127840dfe43f0ac938b039a7ebed146d8ead383a572f" },
  "darwin-x64": { suffix: "x64-macos-13", digest: "5fc0de946c5b2fad33f16bd22a5b06f4fd0dfa7f6d770284237e3f1f3ca9f73d" },
  "linux-x64": { suffix: "x64-ubuntu-22.04", digest: "a46a9ff7cdd720f7955854c78e95df13f4cfe6b80691b05f8654fe19e8267179" },
  "win32-x64": { suffix: "x64-windows-2022", digest: "3653f05a111ca21e234709ea7b25ce96083fd6c6f10484256ba54110dbc0654d" },
};

export async function verifyFile(binary: string, file: string): Promise<boolean> {
  let output: string;
  try {
    const { stdout } = await exec(binary, ["verify", "--cores", "1", "--verification-time-limit", "10", file], {
      timeout: 30_000, maxBuffer: 1024 * 1024,
    });
    output = stdout;
  } catch (error) {
    const e = error as { code?: number | string; stdout?: string; stderr?: string; message: string };
    const log = [e.stdout, e.stderr].filter(Boolean).join("\n").trim();
    const internal = /internal (?:compilation exception|error)/i.test(log);
    if (e.code === 4 && !internal) return false;
    // Compiler exceptions can include a full .NET stack dump. Surface the cause.
    const detail = log.split(/\r?\n/).find(line => /error|exception|could not find/i.test(line));
    throw new Error(detail?.trim() || log.split(/\r?\n/)[0] || e.message);
  }
  if (!/\b[1-9]\d* verified, 0 errors\b/.test(output)) throw new Error("Dafny produced no verification summary.");
  return true;
}

async function usable(binary: string, probe: string): Promise<boolean> {
  try {
    return await verifyFile(binary, probe);
  } catch {
    return false;
  }
}

// Publish complete bundles by rename. If an installed bundle is damaged, use the
// next slot so concurrent checks can finish with the files they already opened.
async function cacheSlot(probe: string): Promise<{ dir: string; ready: boolean }> {
  for (let index = 1; ; index++) {
    const dir = join(cache, String(index));
    if (!existsSync(dir)) return { dir, ready: false };
    if (existsSync(join(dir, "DafnyPrelude.bpl")) && await usable(join(dir, executable), probe)) {
      return { dir, ready: true };
    }
  }
}

export async function resolveDafny(workDir: string): Promise<string> {
  const probe = join(workDir, "ToolchainProbe.dfy");
  await writeFile(probe, "method Probe(x: int) returns (y: int) ensures y > x { y := x + 1; }\n");
  const override = process.env.DAFNY;
  if (override) {
    const binary = /[/\\]/.test(override) ? resolve(override) : override;
    try {
      if (!await verifyFile(binary, probe)) throw new Error("the setup proof failed");
      return binary;
    } catch (error) {
      throw new Error(`Dafny could not verify a setup proof using ${override}.\n${(error as Error).message}\nFix DAFNY or unset it to use automatic setup.`);
    }
  }

  let slot = await cacheSlot(probe);
  if (slot.ready) return join(slot.dir, executable);
  const system = Bun.which("dafny");
  if (system && await usable(system, probe)) return system;

  const release = releases[platform];
  if (!release) throw new Error(`Set DAFNY to a working Dafny executable for ${platform}.`);
  await mkdir(cache, { recursive: true });
  const stage = await mkdtemp(join(cache, ".install-"));
  try {
    const archive = join(stage, "release.zip");
    const url = `https://github.com/dafny-lang/dafny/releases/download/v${version}/dafny-${version}-${release.suffix}.zip`;
    process.stderr.write(`pud: downloading Dafny ${version} for ${platform}\n`);
    const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
    if (!response.ok) throw new Error(`download returned HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== release.digest) throw new Error("release checksum mismatch");
    await writeFile(archive, bytes);
    if (process.platform === "win32") await exec("tar", ["-xf", archive, "-C", stage]);
    else await exec("unzip", ["-q", archive, "-d", stage]);
    const extracted = join(stage, "dafny");
    if (!await verifyFile(join(extracted, executable), probe)) throw new Error("the downloaded toolchain failed its setup proof");
    while (!slot.ready) {
      try {
        await rename(extracted, slot.dir);
        break;
      } catch (error) {
        if (!existsSync(slot.dir)) throw error;
        slot = await cacheSlot(probe);
      }
    }
    return join(slot.dir, executable);
  } catch (error) {
    throw new Error(`Could not set up Dafny ${version}: ${(error as Error).message}. Retry or set DAFNY to a complete installation.`);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
