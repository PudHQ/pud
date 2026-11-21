import { globeFrame, height, palette, width } from "../lib/globe";

export function GET() {
  const frame = globeFrame();
  const paths = palette.map(() => "");
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width;) {
      const start = x, color = frame[y * width + x++];
      while (x < width && frame[y * width + x] === color) x++;
      if (color) paths[color] += "M" + start + " " + y + "h" + (x - start) + "v1h-" + (x - start) + "z";
    }
  }
  const body = paths.map((d, i) => d && '<path fill="' + palette[i] + '" d="' + d + '"/>').join("");
  return new Response('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + " " + height + '" shape-rendering="crispEdges">' + body + "</svg>", { headers: { "Content-Type": "image/svg+xml" } });
}
