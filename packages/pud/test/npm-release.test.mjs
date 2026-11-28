import { expect, test } from "bun:test";
import { inspectReleaseAsset, publishedVersionMatches } from "../../../scripts/npm-release-state.mjs";

test("a retry can finish a published npm version only with its original archive", () => {
  const version = "0.0.2";
  const integrity = "sha512-2MEvemNsGRAsNPeecj7/Tm073Yulew6lM8+NwJrd4QmJCXTIhI7FtGY7RjMLAHTRl+LYLeOI6Ajz2oi9uWcgUA==";
  const registry = { versions: { [version]: { dist: { integrity } } }, "dist-tags": { latest: "0.0.3" } };
  expect(publishedVersionMatches(registry, version, integrity)).toBe(true);
  expect(() => publishedVersionMatches(registry, version, "different")).toThrow("different contents");
});

test("a fresh stable release must advance the npm latest tag", () => {
  const registry = { versions: {}, "dist-tags": { latest: "0.9.10" } };
  expect(publishedVersionMatches(registry, "0.10.0", "")).toBe(false);
  expect(() => publishedVersionMatches(registry, "0.9.2", "")).toThrow("newer");
  registry["dist-tags"].latest = "0.10.0-rc.1";
  expect(publishedVersionMatches(registry, "0.10.0", "")).toBe(false);
});

test("a retry reuses a matching asset and repairs an interrupted draft upload", () => {
  const file = "pud.dev-0.0.3.tgz";
  const uploaded = { apiUrl: "https://api.github.com/repos/PudHQ/pud/releases/assets/123", name: file, state: "uploaded", size: 1200, digest: "sha256:aaa" };
  const draft = { isDraft: true, assets: [uploaded] };
  expect(inspectReleaseAsset(draft, file, uploaded.digest)).toEqual({ asset: uploaded, interruptedUpload: false });
  expect(() => inspectReleaseAsset(draft, file, "sha256:bbb")).toThrow("different or missing digest");
  const starter = { ...uploaded, state: "starter", size: 0, digest: null };
  expect(inspectReleaseAsset({ isDraft: true, assets: [starter] }, file, uploaded.digest).interruptedUpload).toBe(true);
  expect(() => inspectReleaseAsset({ isDraft: false, assets: [starter] }, file, uploaded.digest)).toThrow();
  expect(() => inspectReleaseAsset({ isDraft: false, assets: [] }, file, uploaded.digest)).toThrow("missing");
});
