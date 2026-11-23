export const crtFrameName = "puddex-crt";
export const crtWarpScale = 0.082;

const horizontalBow = 0.026;
const verticalBow = 0.036;

// Coordinates are measured on the flat raster, then bent toward the tube.
export function bendRaster(x: number, y: number): [number, number] {
  return [x * (1 - horizontalBow * y * y), y * (1 - verticalBow * x * x)];
}

// Displacement maps address the source pixel for each output pixel.
export function sampleRaster(x: number, y: number): [number, number] {
  let u = x;
  let v = y;
  for (let pass = 0; pass < 5; pass++) {
    u = x / (1 - horizontalBow * Math.min(v * v, 1));
    v = y / (1 - verticalBow * Math.min(u * u, 1));
  }
  return [u, v];
}

const mapEdge = 160;
let cachedMap: { aspect: number; url: string } | undefined;

export function rasterDisplacement(verticalAspect: number) {
  const aspect = Math.round(verticalAspect * 1000) / 1000;
  if (cachedMap?.aspect === aspect) return cachedMap.url;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = mapEdge;
  const ink = canvas.getContext("2d");
  if (!ink) return null;
  const pixels = ink.createImageData(mapEdge, mapEdge);
  for (let row = 0; row < mapEdge; row++) {
    const y = (row + 0.5) / mapEdge * 2 - 1;
    for (let column = 0; column < mapEdge; column++) {
      const x = (column + 0.5) / mapEdge * 2 - 1;
      const [u, v] = sampleRaster(x, y);
      const index = (row * mapEdge + column) * 4;
      pixels.data[index] = (0.5 + (u - x) / (2 * crtWarpScale)) * 255;
      pixels.data[index + 1] = (0.5 + (v - y) * aspect / (2 * crtWarpScale)) * 255;
      pixels.data[index + 3] = 255;
    }
  }
  ink.putImageData(pixels, 0, 0);
  const url = canvas.toDataURL();
  cachedMap = { aspect, url };
  return url;
}
