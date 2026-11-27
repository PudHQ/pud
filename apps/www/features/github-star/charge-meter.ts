import type { Point } from "./lighting";

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 78.23) * 43758.5453;
  return value - Math.floor(value);
}

function bolt(from: Point, to: Point, segments: number, scatter: number, seed: number) {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t + (noise(seed + index) - 0.5) * scatter * Math.sin(Math.PI * t),
    };
  });
}

function trace(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
}

export function createStarCharge(canvas: HTMLCanvasElement, style: CSSStyleDeclaration) {
  const ctx = canvas.getContext("2d");
  const blue = style.getPropertyValue("--color-blue-500").trim();
  const navy = style.getPropertyValue("--color-blue-950").trim();
  const ice = style.getPropertyValue("--color-cyan-200").trim();
  const white = style.getPropertyValue("--color-white").trim();
  const softBlue = `color-mix(in srgb, ${blue} 62%, transparent)`;
  let width = 0;
  let height = 0;
  let seed = Math.random() * 1000;

  function resize(nextWidth: number, nextHeight: number) {
    if (!ctx || !nextWidth || !nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    const ratio = Math.min(2, window.devicePixelRatio);
    const pixelsWide = Math.round(width * ratio);
    const pixelsHigh = Math.round(height * ratio);
    if (canvas.width === pixelsWide && canvas.height === pixelsHigh) return;
    canvas.width = pixelsWide;
    canvas.height = pixelsHigh;
    ctx.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
  }

  function clear() {
    ctx?.clearRect(0, 0, width, height);
    seed = Math.random() * 1000;
  }

  function paint(age: number, charge: number, opacity: number, impact: number) {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0, 0, width, height);
    const front = width * (0.08 + charge * 0.92);
    const phase = seed + Math.floor(age / 86) * 47;
    const fringe = Math.min(18, front * 0.7, (width - front) * 1.6);
    const bank = Array.from({ length: 10 }, (_, i) => ({
      x: front - fringe * (0.25 + 0.75 * noise(phase + 20 + i)),
      y: height * i / 9,
    }));

    ctx.save();
    ctx.beginPath();
    trace(ctx, bank);
    ctx.lineTo(0, height);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.clip();

    const field = ctx.createLinearGradient(0, height, front, 0);
    field.addColorStop(0, navy);
    field.addColorStop(0.55, softBlue);
    field.addColorStop(0.92, blue);
    field.addColorStop(1, ice);
    ctx.globalAlpha = opacity * (0.53 + 0.16 * impact);
    ctx.fillStyle = field;
    ctx.fillRect(0, 0, width, height);

    const core = bolt(
      { x: -1, y: height * 0.54 },
      { x: front, y: height * (0.39 + noise(phase) * 0.23) },
      Math.max(4, Math.ceil(front / 10)),
      height * 0.38,
      phase,
    );
    ctx.beginPath();
    trace(ctx, core);
    for (let i = 0; i < 4; i++) {
      const start = core[Math.floor((0.24 + i * 0.17) * (core.length - 1))];
      const reach = front * (0.17 + 0.21 * noise(phase + 30 + i));
      const end = {
        x: Math.min(front + 8, start.x + reach),
        y: height * (i % 2 === 0 ? 0.05 + noise(phase + 41 + i) * 0.2 : 0.76 + noise(phase + 41 + i) * 0.2),
      };
      trace(ctx, bolt(start, end, 4, height * 0.27, phase + 51 + i * 7));
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 7;
    ctx.globalAlpha = opacity * (0.56 + 0.18 * impact);
    ctx.strokeStyle = blue;
    ctx.stroke();
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = opacity * 0.9;
    ctx.strokeStyle = ice;
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = opacity * (0.7 + 0.23 * impact);
    ctx.strokeStyle = white;
    ctx.stroke();
    ctx.restore();
  }

  return { resize, clear, paint };
}
