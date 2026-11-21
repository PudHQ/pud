import { deepStrictEqual, strictEqual } from "node:assert";

export type Point = Readonly<{ x: bigint; y: bigint }>;

// h always means the height before the clockwise turn.
export function cw(h: bigint, p: Point): Point {
  return { x: h - 1n - p.y, y: p.x };
}

export function ccw(h: bigint, p: Point): Point {
  return { x: p.y, y: h - 1n - p.x };
}

export function inside(w: bigint, h: bigint, p: Point): boolean {
  return 0n <= p.x && p.x < w && 0n <= p.y && p.y < h;
}

// A byte per pixel, stored left to right and then top to bottom.
// The caller keeps the source pixels stable during the copy.
export type Raster = Readonly<{
  width: number;
  height: number;
  pixels: Uint8Array;
}>;

export function rotateRaster({ width: w, height: h, pixels }: Raster): Raster {
  if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) ||
      w <= 0 || h <= 0 || w * h !== pixels.length) {
    throw new RangeError("Expected a nonempty rectangular raster");
  }

  const out = new Uint8Array(pixels.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      out[x * h + (h - 1 - y)] = pixels[y * w + x];
    }
  }
  return { width: h, height: w, pixels: out };
}

// For nonnegative signed 32-bit indices, reproduce Java's overflowing midpoint.
export function brokenMidpoint32(lo: number, hi: number): number {
  const sum = (lo + hi) | 0;
  return Math.trunc(sum / 2);
}

// Both endpoints are integer indices between 0 and 2**31 - 1, inclusive.
export function midpoint(lo: number, hi: number): number {
  return lo + Math.floor((hi - lo) / 2);
}

// The endpoints are indices in midpoint's range, with good < bad.
// They are known good and bad. The predicate becomes true once and stays true.
export function firstBad(
  good: number,
  bad: number,
  isBad: (revision: number) => boolean,
): number {
  while (bad - good > 1) {
    const mid = midpoint(good, bad);
    if (isBad(mid)) {
      bad = mid;
    } else {
      good = mid;
    }
  }
  return bad;
}

if (import.meta.main) {
  const p = { x: 2n, y: 0n };
  strictEqual(inside(4n, 3n, p), true);
  deepStrictEqual(cw(3n, p), { x: 2n, y: 2n });
  deepStrictEqual(ccw(3n, cw(3n, p)), p);

  const image = { width: 4, height: 3, pixels: new TextEncoder().encode("ABCDEFGHIJKL") };
  const turned = rotateRaster(image);
  deepStrictEqual([turned.width, turned.height], [3, 4]);
  strictEqual(new TextDecoder().decode(turned.pixels), "IEAJFBKGCLHD");
  strictEqual(new TextDecoder().decode(image.pixels), "ABCDEFGHIJKL");

  const edge = 2 ** 30;
  strictEqual(brokenMidpoint32(edge, edge), -edge);
  strictEqual(midpoint(edge, edge), edge);

  for (let first = 1; first <= 8; first++) {
    let queries = 0;
    const found = firstBad(0, 8, (revision) => {
      queries++;
      return revision >= first;
    });
    strictEqual(found, first);
    strictEqual(queries, 3);
  }
  console.log("Checked the coordinate turn, pixel copy, midpoint, and eight bisections.");
}
