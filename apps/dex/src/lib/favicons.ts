import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { faviconId } from "./web-links";

const size = 16;
const palette = [
  [24, 36, 49], [69, 84, 97], [125, 143, 154], [191, 202, 205], [255, 251, 239],
  [18, 54, 100], [49, 105, 165], [114, 170, 207], [183, 220, 230],
  [144, 58, 45], [248, 96, 55], [255, 176, 103], [255, 220, 158],
  [76, 99, 78], [48, 136, 141], [125, 100, 175],
];
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export async function styliseFavicon(input: Buffer) {
  const pixels = await sharp(input, { limitInputPixels: 4096 ** 2 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toColourspace("srgb").ensureAlpha().raw().toBuffer();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] < 112) {
        pixels.fill(0, i, i + 4);
        continue;
      }
      // A small ordered dither keeps shading legible at the native icon size.
      const bias = bayer[(y % 4) * 4 + x % 4] - 7.5;
      const r = pixels[i] + bias, g = pixels[i + 1] + bias, b = pixels[i + 2] + bias;
      let best = palette[0], distance = Infinity;
      for (const colour of palette) {
        const difference = 3 * (r - colour[0]) ** 2 + 5 * (g - colour[1]) ** 2 + 2 * (b - colour[2]) ** 2;
        if (difference < distance) { best = colour; distance = difference; }
      }
      pixels.set(best, i);
      pixels[i + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colours: 32, dither: 0 }).toBuffer();
}

const genericGlobe = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="#3169a5" stroke="#123664"/>
  <g stroke="#b7dce6" fill="none"><ellipse cx="8" cy="8" rx="3.5" ry="6.5"/><path d="M2 5.5h12M1 8.5h14M3 11.5h10"/></g>
</svg>`);
const week = 7 * 24 * 60 * 60 * 1000;
const cacheDir = resolve("node_modules/.cache/puddex-favicons-v1");
const maxBytes = 2 * 1024 * 1024;

async function downloadIcon(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: "error" });
  if (!response.ok || !response.body || Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Icon unavailable");
  }
  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > maxBytes) { await reader.cancel(); throw new Error("Oversized icon"); }
    chunks.push(value);
  }
  return styliseFavicon(Buffer.concat(chunks));
}

async function cacheIcon(file: string, png: Buffer) {
  await mkdir(cacheDir, { recursive: true });
  const temporary = file + "." + randomUUID();
  try {
    await writeFile(temporary, png);
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function loadIcon(host: string) {
  const file = join(cacheDir, faviconId(host) + ".png");
  const [cached, details] = await Promise.all([
    readFile(file).catch(() => undefined), stat(file).catch(() => undefined),
  ]);
  if (cached && details && Date.now() - details.mtimeMs < week) return cached;

  if (host.includes(".") && !isIP(host) && !host.endsWith(".localhost") && !host.endsWith(".local")) {
    // Only the hostname goes to these image services. Page paths and queries stay in the vault.
    const domain = encodeURIComponent(host);
    const sources = [
      `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=64&url=https%3A%2F%2F${domain}`,
      `https://a.favicon.im/${domain}?larger=true&throw-error-on-404=true`,
    ];
    for (const source of sources) {
      const png = await downloadIcon(source).catch(() => undefined);
      if (png) {
        await cacheIcon(file, png).catch(() => undefined);
        return png;
      }
    }
  }
  return cached ?? styliseFavicon(genericGlobe);
}

// Render once for concurrent dev requests. Retry missing icons after five minutes.
const recent = new Map<string, { until: number; result: Promise<Buffer> }>();
export function faviconForHost(host: string) {
  const previous = recent.get(host);
  if (previous && previous.until > Date.now()) return previous.result;
  const result = loadIcon(host);
  recent.set(host, { until: Date.now() + 5 * 60 * 1000, result });
  return result;
}
