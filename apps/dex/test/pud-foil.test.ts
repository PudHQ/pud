import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createPudFoil } from "../src/lib/pud-foil";

test("the foil reveals its reverse when curled and settles back to the exact printed sprite", async () => {
  const sprite = fileURLToPath(new URL("../public/pud-chrome.png", import.meta.url));
  const { data, info } = await sharp(sprite).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const foil = createPudFoil(new Uint8ClampedArray(data), info.width, info.height);
  const flat = Buffer.alloc(foil.pixels.length);
  const left = (foil.width - info.width) / 2, top = (foil.height - info.height) / 2;
  for (let row = 0; row < info.height; row++) {
    const start = row * info.width * 4;
    data.copy(flat, ((top + row) * foil.width + left) * 4, start, start + info.width * 4);
  }
  foil.draw(1, Math.PI / 2);
  const bottomCurl = Buffer.from(foil.pixels);
  expect(foil.pixels.some((r, i, rgba) =>
    i % 4 === 0 && r > rgba[i + 1] + 40 && rgba[i + 3] > 0 && rgba[i + 3] < 255)).toBe(true);
  foil.draw(1, -0.5);
  expect(bottomCurl.equals(foil.pixels)).toBe(false);
  foil.draw(0, -0.5);
  expect(flat.equals(foil.pixels)).toBe(true);
});
