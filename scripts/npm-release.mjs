import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { publishedVersionMatches, inspectReleaseAsset } from "./npm-release-state.mjs";

const { RELEASE_VERSION: version, GITHUB_SHA: sha, GITHUB_REPOSITORY: repo } = process.env;
const parts = version?.split(".") ?? [];
const validPart = part => /^(0|[1-9][0-9]*)$/.test(part) && Number.isSafeInteger(Number(part)) && part === part.trim();
if (parts.length !== 3 || !parts.every(validPart)) {
  throw new Error("Enter a stable version in MAJOR.MINOR.PATCH form, such as 0.0.3.");
}
if (!/^[a-f0-9]{40}$/.test(sha) || process.env.GITHUB_REF !== `refs/heads/${process.env.DEFAULT_BRANCH}`) {
  throw new Error("Select the default branch for the release.");
}

const tag = `v${version}`;
const filename = `pud.dev-${version}.tgz`;
const archive = `./dist/${filename}`;
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
function digest(algorithm, encoding) {
  return createHash(algorithm).update(readFileSync(archive)).digest(encoding);
}

async function publishedOnNpm() {
  const response = await fetch("https://registry.npmjs.org/pud.dev", {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status}.`);
  return publishedVersionMatches(await response.json(), version, `sha512-${digest("sha512", "base64")}`);
}

function githubRelease() {
  const result = spawnSync("gh", ["release", "view", tag, "--repo", repo, "--json", "targetCommitish,isDraft,isPrerelease,assets"], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status === 0) return JSON.parse(result.stdout);
  if (result.stderr.trim() === "release not found") return undefined;
  throw new Error(result.stderr);
}

function inspectGitHub() {
  const ref = `refs/tags/${tag}`;
  // ls-remote prints the peeled commit after an annotated tag's own object ID.
  const refs = execFileSync("git", ["ls-remote", "origin", ref, `${ref}^{}`], { encoding: "utf8" }).trim();
  const commit = refs && refs.split("\n").at(-1).split("\t")[0];
  if (commit && commit !== sha) throw new Error(`${tag} already points to ${commit}, expected ${sha}.`);
  const release = githubRelease();
  if (release) {
    if (release.isPrerelease) throw new Error(`The GitHub release for ${tag} is marked as a prerelease.`);
    const targetIsCommit = /^[a-f0-9]{40}$/.test(release.targetCommitish);
    if ((!commit || targetIsCommit) && release.targetCommitish !== sha) {
      throw new Error(`The GitHub release for ${tag} targets ${release.targetCommitish}, expected ${sha}.`);
    }
  }
  return { commit, release, ...inspectReleaseAsset(release, filename, `sha256:${digest("sha256", "hex")}`) };
}

switch (process.argv[2]) {
  case "pack": {
    const { pack } = await import("../packages/pud/scripts/pack.ts");
    console.log(await pack("dist", { version, gitHead: sha }));
    break;
  }
  case "prepare": {
    const { commit, release, asset, interruptedUpload } = inspectGitHub();
    await publishedOnNpm();
    if (!commit) gh("api", `repos/${repo}/git/refs`, "--method", "POST", "-f", `ref=refs/tags/${tag}`, "-f", `sha=${sha}`);
    if (!release) gh("release", "create", tag, "--repo", repo, "--target", sha, "--verify-tag", "--draft", "--title", `Pud ${version}`, "--generate-notes");
    if (interruptedUpload) gh("api", asset.apiUrl, "--method", "DELETE");
    if (!asset || interruptedUpload) gh("release", "upload", tag, archive, "--repo", repo);
    break;
  }
  case "publish":
    if (!(await publishedOnNpm())) execFileSync("npm", ["publish", archive, "--access", "public"], { stdio: "inherit" });
    break;
  case "finish": {
    const { commit, release, asset, interruptedUpload } = inspectGitHub();
    if (!commit || !release || !asset || interruptedUpload) throw new Error(`The tag, release or verified archive for ${tag} is missing.`);
    if (release.isDraft) gh("release", "edit", tag, "--repo", repo, "--draft=false");
    console.log(`https://github.com/${repo}/releases/tag/${tag}`);
    break;
  }
  default:
    throw new Error("Expected pack, prepare, publish or finish.");
}
