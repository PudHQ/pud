import sharp from "sharp";
import { ditherThreshold, palette } from "./globe";

export const stampWidth = 372;
export const stampHeight = 82;

const pud = [
  [4, "M0 0H38L49 11V31L39 41H17V61H0Z M17 13V28H33L35 26V15L33 13Z"],
  [60, "M0 16H15V45L19 49H31L35 45V16H50V61H35V57L31 61H10L0 51Z"],
  [117, "M10 16H32L36 20V0H51V61H36V57L32 61H10L0 51V26Z M15 32V45L19 49H32L36 45V32L32 28H19Z"],
] as const;
const dex = [
  [176, "M0 0H44L59 15V45L43 61H0Z M17 14V47H37L43 41V20L37 14Z"],
  [243, "M10 16H40L50 26V42H15V46L18 49H49V61H10L0 51V26Z M15 32V34H36V31L33 28H19Z"],
  [301, "M0 16H17L26 29L36 16H53L36 39L53 61H36L26 48L17 61H0L17 39Z"],
] as const;

const pixelWidth = stampWidth / 2, pixelHeight = stampHeight / 2;
const trim = palette.map(color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) || 0));
const vermilion = [255, 70, 45];
const blend = (from: number[], to: number[], weight: number) =>
  from.map((channel, i) => Math.round(channel + (to[i] - channel) * weight));
const enamel = [blend(trim[7], vermilion, .47), blend(trim[7], vermilion, .78), vermilion,
  blend(vermilion, trim[11], .23), blend(vermilion, trim[12], .44)];
const silver = [trim[5], trim[6], trim[14], blend(trim[14], trim[15], .5), trim[15]];

async function rasterizeStamp() {
  // The shape pass labels the front and sides separately, at the globe's pixel scale.
  const shapes = (glyphs: typeof pud | typeof dex, ink: string, depth: number) => glyphs.map(([x, d]) =>
    `<path fill="${ink}" d="${d}" transform="translate(${x + 9 + depth} ${7 + depth}) matrix(1 0 -.12 1 0 0)"/>`).join("");
  const sides = [8, 6, 4, 2].map(depth => shapes(pud, "#404040", depth) + shapes(dex, "#808080", depth)).join("");
  const front = shapes(pud, "#c0c0c0", 0) + shapes(dex, "#ffffff", 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${pixelHeight}"
    viewBox="0 0 ${stampWidth} ${stampHeight}" fill-rule="evenodd" shape-rendering="crispEdges">${sides}${front}</svg>`;
  const source = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const pixels = Buffer.alloc(source.length), mask = Buffer.alloc(source.length);
  const surface = (x: number, y: number) => {
    if (x < 0 || x >= pixelWidth || y < 0 || y >= pixelHeight) return 0;
    const i = 4 * (y * pixelWidth + x);
    return source[i + 3] > 127 ? Math.round(source[i] / 64) : 0;
  };

  for (let y = 0; y < pixelHeight; y++) {
    for (let x = 0; x < pixelWidth; x++) {
      const face = surface(x, y);
      if (!face) continue;
      const i = 4 * (y * pixelWidth + x);
      const grain = ditherThreshold(x, y);
      let color: number[];
      if (face < 3) {
        const reflected = surface(x - 1, y - 1) > 2 || grain < .21;
        color = face === 1 ? trim[reflected ? 8 : 7] : trim[reflected ? 4 : 2];
      } else {
        const ramp = face === 3 ? enamel : silver;
        const litEdge = surface(x, y - 1) !== face || surface(x - 1, y) !== face;
        const lowerEdge = surface(x, y + 1) !== face;
        const light = 3.85 - 1.85 * y / pixelHeight - .35 * x / pixelWidth + grain;
        const shade = Math.max(0, Math.min(4, Math.floor(light) - Number(lowerEdge)));
        color = litEdge ? trim[face === 3 ? (grain < .45 ? 11 : 12) : 15] : ramp[shade];
        mask.fill(255, i, i + 4);
      }
      pixels.set(color, i);
      pixels[i + 3] = 255;
    }
  }

  const embed = async (data: Buffer) => `data:image/png;base64,${(await sharp(data, {
    raw: { width: pixelWidth, height: pixelHeight, channels: 4 },
  }).png().toBuffer()).toString("base64")}`;
  const [print, faces] = await Promise.all([embed(pixels), embed(mask)]);
  return { print, faces };
}

let art: ReturnType<typeof rasterizeStamp> | undefined;
export const getOrbitStampArt = () => art ??= rasterizeStamp();
