type Brush = CanvasRenderingContext2D;
type Point = { x: number; y: number };
type Plate = { face: HTMLCanvasElement; back: HTMLCanvasElement };
export type Posters = [Plate, Plate];
const blue = "#2722be",
  citron = "#d9fb48",
  white = "#fffded",
  ink = "#17152d";

function printText(ctx: Brush, text: string, font: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.font = font;
  const m = ctx.measureText(text);
  const actualWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const actualHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  ctx.translate(x, y);
  ctx.scale(w / actualWidth, h / actualHeight);
  ctx.fillText(text, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
  ctx.restore();
}

function plate(width: number, height: number, second: boolean, reverse: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = reverse ? "#f5e8c7" : second ? citron : blue;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = reverse ? "#b7a9af" : second ? ink : white;
  const phone = width / height < 0.86;
  if (second) {
    ctx.save();
    ctx.translate(width * 0.51, height * 0.505);
    ctx.rotate(-0.06);
    ctx.translate(-width * 0.51, -height * 0.505);
    printText(
      ctx,
      "Proof.",
      "italic 900 270px Georgia, serif",
      width * 0.026,
      height * (phone ? 0.33 : 0.25),
      width * 0.935,
      height * (phone ? 0.3 : 0.43),
    );
    ctx.restore();
  } else {
    printText(
      ctx,
      "TYPE",
      "1000 240px Arial, sans-serif",
      width * 0.036,
      height * (phone ? 0.25 : 0.19),
      width * 0.65,
      height * (phone ? 0.174 : 0.235),
    );
    printText(
      ctx,
      "SCRIPT",
      "1000 240px Arial, sans-serif",
      width * 0.033,
      height * (phone ? 0.43 : 0.435),
      width * 0.903,
      height * (phone ? 0.174 : 0.235),
    );
  }
  return canvas;
}

export function printPosters(width: number, height: number): Posters {
  return [
    {
      face: plate(width, height, false, false),
      back: plate(width, height, false, true),
    },
    {
      face: plate(width, height, true, false),
      back: plate(width, height, true, true),
    },
  ];
}

function band(ctx: Brush, crease: Point, n: Point, t: Point, lo: number, hi: number, span: number) {
  ctx.beginPath();
  for (const [i, [u, v]] of [
    [lo, -span],
    [hi, -span],
    [hi, span],
    [lo, span],
  ].entries()) {
    const x = crease.x + n.x * u + t.x * v,
      y = crease.y + n.y * u + t.y * v;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Orthographic section of a paper sheet wrapped through π radians. Both sides carry the print. */
export function foldPoster(
  ctx: Brush,
  posters: Posters,
  side: 0 | 1,
  w: number,
  h: number,
  progress: number,
  grip: number,
) {
  const current = posters[side],
    next = posters[side === 0 ? 1 : 0];
  ctx.drawImage(next.face, 0, 0, w, h);
  if (progress >= 1) return;
  const slope = Math.max(-0.65, Math.min(0.71, ((grip - 0.23) * 0.77 * w) / h));
  const inv = 1 / Math.hypot(1, slope);
  const n = { x: inv, y: slope * inv },
    t = { x: -n.y, y: n.x };
  const crease = { x: w * (1.085 - 1.76 * progress), y: h * 0.5 };
  const c = n.x * crease.x + n.y * crease.y;
  const span = Math.hypot(w, h) * 3;
  const radius = Math.min(37, Math.max(13, w * 0.026)) * (0.9 + 0.24 * Math.sin(progress * Math.PI));
  const arc = Math.PI * radius;

  const shadow = ctx.createLinearGradient(
    crease.x,
    crease.y,
    crease.x + n.x * radius * 4.2,
    crease.y + n.y * radius * 4.2,
  );
  shadow.addColorStop(0, "rgba(26,18,42,.41)");
  shadow.addColorStop(0.39, "rgba(26,18,42,.23)");
  shadow.addColorStop(1, "rgba(26,18,42,0)");
  ctx.save();
  band(ctx, crease, n, t, 0, radius * 4.2, span);
  ctx.clip();
  ctx.fillStyle = shadow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  band(ctx, crease, n, t, -span, 0, span);
  ctx.clip();
  ctx.drawImage(current.face, 0, 0, w, h);
  ctx.restore();

  // Transform only the coordinate normal to the crease. The tangent coordinate stays registered,
  // so the ink travels round the cylinder with the page at every drag position.
  function strip(sheet: HTMLCanvasElement, lo: number, hi: number, k: number, b: number, shade: string) {
    ctx.save();
    const kn = k - 1;
    ctx.transform(
      1 + kn * n.x * n.x,
      kn * n.x * n.y,
      kn * n.x * n.y,
      1 + kn * n.y * n.y,
      n.x * (b - kn * c),
      n.y * (b - kn * c),
    );
    band(ctx, crease, n, t, lo - 0.2, hi + 0.2, span);
    ctx.clip();
    ctx.drawImage(sheet, 0, 0, w, h);
    if (shade) {
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
  const slices = 18;
  for (let i = 0; i < slices; i++) {
    const lo = (arc * i) / slices,
      hi = (arc * (i + 1)) / slices;
    const angle = ((i + 0.5) * Math.PI) / slices;
    const f = radius * Math.sin(lo / radius);
    const k = (radius * Math.sin(hi / radius) - f) / (hi - lo);
    const light = Math.sin(angle);
    const front = angle < Math.PI / 2;
    strip(
      front ? current.face : current.back,
      lo,
      hi,
      k,
      f - k * lo,
      front ? `rgba(255,250,234,${light * 0.19})` : `rgba(42,32,52,${0.34 * light})`,
    );
  }
  strip(current.back, arc, span, -0.72, 0.72 * arc, "");
}
