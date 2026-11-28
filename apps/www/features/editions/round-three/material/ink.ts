import { makeCanvas } from "./surface";

export function printHalftone(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  ink: string,
  spacing: number,
  contrast = 1.15,
  dot = 0.7,
  white = 0.91,
) {
  const cols = Math.ceil(width / spacing),
    rows = Math.ceil(height / spacing);
  const sample = makeCanvas(cols, rows);
  const s = sample.getContext("2d");
  if (!s) return;
  s.fillStyle = "white";
  s.fillRect(0, 0, cols, rows);
  s.drawImage(source, 0, 0, cols, rows);
  const px = s.getImageData(0, 0, cols, rows).data;
  ctx.fillStyle = ink;
  ctx.beginPath();
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      const luminance = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      const darkness = Math.max(0, Math.min(1, (white - luminance) * contrast));
      if (darkness < 0.035) continue;
      const radius = Math.sqrt(darkness) * spacing * dot;
      const cx = x + (c + (r % 2) * 0.35) * spacing,
        cy = y + r * spacing;
      ctx.moveTo(cx + radius, cy);
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    }
  ctx.fill();
}

export function fitType(
  ctx: CanvasRenderingContext2D,
  words: string,
  x: number,
  y: number,
  width: number,
  height: number,
  font = "900 180px Arial, sans-serif",
) {
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  const metrics = ctx.measureText(words);
  ctx.translate(x, y);
  ctx.scale(width / metrics.width, height / (metrics.actualBoundingBoxAscent || 132));
  ctx.fillText(words, 0, 0);
  ctx.restore();
}
