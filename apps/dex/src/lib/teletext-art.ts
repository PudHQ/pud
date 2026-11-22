import sharp from "sharp";
import { globeFrame, height, palette, width } from "./globe";
import { getOrbitStampArt } from "./orbit-stamp-art";

const imageUrl = (pixels: Buffer) => `data:image/png;base64,${pixels.toString("base64")}`;
const colors = [0, 1, 1, 3, 3, 5, 6, 7, 8, 10, 10, 11, 12, 5, 14, 15]
  .map(index => [1, 3, 5].map(start => parseInt(palette[index].slice(start, start + 2), 16) || 0));

async function makeTeletextArt() {
  const { print } = await getOrbitStampArt();
  const stamp = await sharp(Buffer.from(print.slice(print.indexOf(",") + 1), "base64"))
    .resize({ width: 62, kernel: "nearest" }).png().toBuffer();

  const frame = globeFrame();
  const cell = 5;
  const columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const rgba = Buffer.alloc(columns * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const left = x * cell, top = y * cell;
      let color = frame[(top + 2) * width + Math.min(left + 2, width - 1)];
      // Carry the narrow highlights of the masthead orbit into the larger mosaic cells.
      for (let row = top; row < Math.min(top + cell, height) && color < 14; row++) {
        for (let col = left; col < Math.min(left + cell, width); col++) {
          const sample = frame[row * width + col];
          if (sample >= 14) color = sample;
        }
      }
      if (!color) continue;
      const offset = (y * columns + x) * 4;
      rgba.set(colors[color], offset);
      rgba[offset + 3] = 255;
    }
  }
  const globe = await sharp(rgba, { raw: { width: columns, height: rows, channels: 4 } }).png().toBuffer();
  return { stamp: imageUrl(stamp), globe: imageUrl(globe) };
}

let art: ReturnType<typeof makeTeletextArt> | undefined;
export const getTeletextArt = () => art ??= makeTeletextArt();
