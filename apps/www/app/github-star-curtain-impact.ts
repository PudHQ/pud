type Point = { x: number; y: number };

const between = (min: number, max: number) => min + Math.random() * (max - min);

function bolt(origin: Point, angle: number, reach: number) {
  return [origin, ...[0.16, 0.33, 0.51, 0.69, 0.84, 1].map((t, i) => {
    const angleOffset = (i % 2 ? 1 : -1) * between(0.1, 0.43) * (1 - t);
    return { x: origin.x + Math.cos(angle + angleOffset) * reach * t, y: origin.y + Math.sin(angle + angleOffset) * reach * t };
  })];
}

function trace(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
}

function shard(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(-length * 0.78, 0);
  ctx.lineTo(0, -width);
  ctx.lineTo(length * 0.23, 0);
  ctx.lineTo(-length * 0.06, width * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function cueCurtainImpact(canvas: HTMLCanvasElement, artwork: HTMLElement) {
  let frame = 0;
  const delay = window.setTimeout(() => {
    const ctx = canvas.getContext("2d");
    const modal = canvas.parentElement;
    if (!ctx || !modal?.clientWidth || !modal.clientHeight) return;
    const { clientWidth: width, clientHeight: height } = modal;
    const bounds = artwork.getBoundingClientRect();
    const density = Math.min(1.5, window.devicePixelRatio);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    const palette = getComputedStyle(canvas);
    const gold = palette.getPropertyValue("--star-impact-gold").trim();
    const orange = palette.getPropertyValue("--star-impact-edge").trim();
    const white = palette.getPropertyValue("--star-impact-core").trim();
    const small = bounds.width > width * 0.75;
    const scale = Math.min(1.3, Math.max(0.57, width / 1050));
    const seams = small ? [
      { x: width * 0.57, y: bounds.height * 0.51, power: 0.86, delay: 0 },
      { x: width * 0.45, y: bounds.height, power: 1, delay: 37 },
    ] : [
      { x: bounds.right, y: bounds.height * 0.5, power: 1, delay: 0 },
      { x: bounds.right, y: bounds.height * 0.24, power: 0.51, delay: 26 },
      { x: bounds.right, y: bounds.height * 0.76, power: 0.67, delay: 48 },
    ];

    const strikes = seams.map(({ power, delay, ...origin }) => {
      const arcs = Array.from({ length: Math.ceil(7 * power) }, (_, i) => {
        const angle = (i / (7 * power) + between(-0.055, 0.055)) * Math.PI * 2;
        const points = bolt(origin, angle, between(72, 218) * scale * power);
        const fork = bolt(points[3], angle + between(-0.74, 0.92), between(24, 76) * scale * power);
        return { points, fork, life: between(145, 315) };
      });
      const sparks = Array.from({ length: Math.ceil(25 * power) }, () => ({
        angle: between(0, Math.PI * 2), reach: between(33, 197) * scale * power,
        length: between(7, 27) * scale, life: between(210, 550),
      }));
      return { origin, delay, arcs, sparks, power };
    });
    const started = performance.now();
    canvas.hidden = false;

    function paint(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      const age = now - started;
      for (const strike of strikes) {
        const time = age - strike.delay;
        if (time < 0) continue;
        const { x, y } = strike.origin;
        const impact = Math.max(0, 1 - time / 105);
        const radius = 62 * strike.power * scale;
        if (impact > 0) {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, radius);
          halo.addColorStop(0, gold);
          halo.addColorStop(1, "transparent");
          ctx.globalAlpha = impact * 0.75;
          ctx.fillStyle = halo;
          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
          ctx.fillStyle = white;
          ctx.globalAlpha = impact;
          shard(ctx, x, y, Math.PI * 0.51, radius * 1.28, 2.8);
          shard(ctx, x, y, Math.PI * 1.49, radius * 1.08, 2.4);
          shard(ctx, x, y, Math.PI * 0.04, radius * 0.89, 2.8);
        }
        for (const arc of strike.arcs) {
          const alpha = Math.max(0, 1 - time / arc.life) ** 1.65;
          if (alpha === 0) continue;
          ctx.lineJoin = "miter";
          ctx.lineCap = "butt";
          for (const points of [arc.points, arc.fork]) {
            trace(ctx, points);
            ctx.globalAlpha = alpha * 0.73;
            ctx.strokeStyle = orange;
            ctx.lineWidth = 4.1 * scale;
            ctx.stroke();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = white;
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
          }
        }
        for (const spark of strike.sparks) {
          const progress = time / spark.life;
          if (progress >= 1) continue;
          const reach = spark.reach * (1 - (1 - progress) ** 2.4);
          const px = x + Math.cos(spark.angle) * reach;
          const py = y + Math.sin(spark.angle) * reach + 30 * progress ** 2;
          ctx.globalAlpha = (1 - progress) * Math.min(1, progress * 15);
          ctx.fillStyle = gold;
          shard(ctx, px, py, spark.angle, spark.length, 1.9 * scale);
          ctx.fillStyle = white;
          shard(ctx, px, py, spark.angle, spark.length * 0.72, 0.85 * scale);
        }
      }
      if (age < 610) frame = requestAnimationFrame(paint);
      else canvas.hidden = true;
    }

    frame = requestAnimationFrame(paint);
  }, 393);

  return () => {
    window.clearTimeout(delay);
    cancelAnimationFrame(frame);
    canvas.hidden = true;
  };
}
