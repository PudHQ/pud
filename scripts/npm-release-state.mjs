export function publishedVersionMatches(registry, version, integrity) {
  const manifest = registry.versions[version];
  if (manifest) {
    if (manifest.dist?.integrity !== integrity) {
      throw new Error(`pud.dev@${version} already exists on npm with different contents. Choose a new version.`);
    }
    return true;
  }
  const latest = registry["dist-tags"].latest;
  if (latest) {
    const current = latest.split(/[-+]/, 1)[0].split(".").map(Number);
    const parts = version.split(".");
    const change = parts.findIndex((part, index) => Number(part) !== current[index]);
    const newer = change === -1 ? latest.split("+", 1)[0].includes("-") : Number(parts[change]) > current[change];
    if (!newer) throw new Error(`Choose a version newer than the current npm latest, ${latest}.`);
  }
  return false;
}

export function inspectReleaseAsset(release, filename, digest) {
  const asset = release?.assets.find(file => file.name === filename);
  if (release && !release.isDraft && !asset) throw new Error(`The public release is missing ${filename}.`);
  // A failed GitHub upload can leave a zero-byte "starter" on a draft release.
  const interruptedUpload = release?.isDraft && asset?.state === "starter" && asset.size === 0;
  if (asset && !interruptedUpload && asset.digest !== digest) {
    throw new Error(`The ${filename} release asset already exists with a different or missing digest.`);
  }
  return { asset, interruptedUpload };
}
