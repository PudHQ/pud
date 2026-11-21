// Both renderers use the same folded sheet and draw the translucent layers
// from back to front. UVs always refer to the original pixel art.
const divisions = 14;
const foilMargin = 0.25;

interface Vertex {
  index: number;
  u: number; v: number;
  x: number; y: number; z: number;
  nx: number; ny: number; nz: number;
  light: number; shine: number;
}

export function createFoilMesh(width: number, height: number) {
  const padX = Math.round(width * foilMargin), padY = Math.round(height * foilMargin);
  const frameWidth = width + 2 * padX, frameHeight = height + 2 * padY;
  const vertices: Vertex[] = [];
  const triangles: { a: Vertex; b: Vertex; c: Vertex; depth: number }[] = [];
  for (let row = 0; row <= divisions; row++) {
    for (let col = 0; col <= divisions; col++) {
      vertices.push({ index: vertices.length, u: col / divisions, v: row / divisions, x: 0, y: 0, z: 0,
        nx: 0, ny: 0, nz: 1, light: 1, shine: 0 });
      if (row === 0 || col === 0) continue;
      const i = vertices.length - 1;
      const a = vertices[i - divisions - 2], b = vertices[i - divisions - 1];
      const c = vertices[i], d = vertices[i - 1];
      triangles.push({ a, b, c, depth: 0 }, { a, b: c, c: d, depth: 0 });
    }
  }

  function pose(bend: number, bearing: number) {
    const dx = Math.cos(bearing), dy = Math.sin(bearing);
    const span = 1 + 0.18 * Math.abs(2 * dx * dy);
    for (const point of vertices) {
      const x = point.u * 2 - 1, y = point.v * 2 - 1;
      const along = x * dx + y * dy, across = y * dx - x * dy;
      const side = along < 0 ? -1 : 1;
      // Keep the middle in contact and wind each free edge around a cylinder.
      const hinge = 0.12 * span + 0.08 * across + 0.16 * across ** 2;
      const arc = Math.max(0, Math.abs(along) - hinge);
      const curvature = bend * (side > 0 ? 3.85 : 1.30) / span;
      const angle = arc * curvature, sin = Math.sin(angle), cos = Math.cos(angle);
      const offset = Math.abs(curvature) > 0.0001 ? side * (sin / curvature - arc) : 0;
      const z = Math.abs(curvature) > 0.0001 ? (1 - cos) / curvature : 0;
      const perspective = 1 / (1 - 0.19 * z);
      point.x = (frameWidth + width * (x + dx * offset + 0.16 * z) * perspective) / 2;
      point.y = (frameHeight + height * (y + dy * offset - 0.48 * z) * perspective) / 2;
      point.z = z;
      point.nx = -side * dx * sin;
      point.ny = -side * dy * sin;
      point.nz = cos;
    }
    for (const face of triangles) face.depth = face.a.z + face.b.z + face.c.z;
    triangles.sort((a, b) => a.depth - b.depth);
  }

  return { width: frameWidth, height: frameHeight, vertices, triangles, pose };
}

export function createPudFoil(texture: Uint8ClampedArray, width: number, height: number, mesh = createFoilMesh(width, height)) {
  const { width: frameWidth, height: frameHeight, vertices, triangles } = mesh;
  const pixels = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  // A small spectral lookup gives the software renderer a coloured reflection
  // when WebGPU is unavailable. The unbent print stays exactly as drawn.
  const spectrum = Float32Array.from({ length: 64 * 3 }, (_, i) =>
    1 + 0.85 * Math.cos(2 * Math.PI * (Math.floor(i / 3) / 64 - (i % 3) / 3)));

  function paintTriangle(a: Vertex, b: Vertex, c: Vertex) {
    const bx = b.x - a.x, by = b.y - a.y, cx = c.x - a.x, cy = c.y - a.y;
    const area = bx * cy - by * cx;
    if (Math.abs(area) < 0.001) return;
    const back = area < 0;
    const x0 = Math.max(0, Math.ceil(Math.min(a.x, b.x, c.x) - 0.5));
    const y0 = Math.max(0, Math.ceil(Math.min(a.y, b.y, c.y) - 0.5));
    const x1 = Math.min(frameWidth - 1, Math.floor(Math.max(a.x, b.x, c.x) - 0.5));
    const y1 = Math.min(frameHeight - 1, Math.floor(Math.max(a.y, b.y, c.y) - 0.5));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - a.x, py = y + 0.5 - a.y;
        const wb = (px * cy - py * cx) / area, wc = (bx * py - by * px) / area;
        const wa = 1 - wb - wc;
        if (wa < 0 || wb < 0 || wc < 0) continue;
        const u = Math.min(width - 1, Math.floor((wa * a.u + wb * b.u + wc * c.u) * width));
        const v = Math.min(height - 1, Math.floor((wa * a.v + wb * b.v + wc * c.v) * height));
        const src = (v * width + u) * 4;
        if (!texture[src + 3]) continue;
        const ink = texture[src];
        const light = wa * a.light + wb * b.light + wc * c.light;
        const shine = wa * a.shine + wb * b.shine + wc * c.shine;
        const base = ink * light;
        const colour = 3 * (Math.floor(0.74 * u + 0.28 * v + 65 * (1 - light)) & 63);
        const dst = (y * frameWidth + x) * 4;

        // Screen winding flips as the lip rolls over, revealing the reverse
        // print through vermilion film. Composite it over any intervening fold.
        const alpha = texture[src + 3] / 255 * (back ? 0.86 - 0.12 * ink / 255 : 1);
        const underneath = pixels[dst + 3] / 255 * (1 - alpha);
        const outAlpha = alpha + underneath;
        const red = back ? 137 + ink * 0.41 + shine * 0.57 : base + shine * spectrum[colour];
        const green = back ? 28 + ink * 0.17 + shine * 0.62 : base + shine * spectrum[colour + 1];
        const blue = back ? 26 + ink * 0.10 + shine * 0.58 : base + shine * spectrum[colour + 2];
        pixels[dst] = (red * alpha + pixels[dst] * underneath) / outAlpha;
        pixels[dst + 1] = (green * alpha + pixels[dst + 1] * underneath) / outAlpha;
        pixels[dst + 2] = (blue * alpha + pixels[dst + 2] * underneath) / outAlpha;
        pixels[dst + 3] = 255 * outAlpha;
      }
    }
  }

  function draw(bend: number, bearing: number) {
    mesh.pose(bend, bearing);
    for (const point of vertices) {
      const { nx, ny, nz: cos } = point;
      const rim = Math.max(0, 1 - Math.abs(cos - 0.16 * nx + 0.48 * ny));
      const reflection = 2 * cos * (nx * 0.66 - ny * 0.75);
      const band = Math.max(0, 1 - Math.abs(Math.abs(reflection) - 0.64) * 3.6);
      const tilt = Math.min(1, Math.acos(cos) * 1.5);
      point.light = 1 + tilt * (-0.23 + 0.12 * cos - 0.22 * nx - 0.14 * ny);
      point.shine = tilt * (106 * band ** 2 + 72 * rim ** 3);
    }
    pixels.fill(0);
    for (const { a, b, c } of triangles) paintTriangle(a, b, c);
  }

  return { pixels, width: frameWidth, height: frameHeight, draw };
}
