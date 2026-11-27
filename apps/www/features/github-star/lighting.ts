import { drawFollowspotRig, followspotLens, type FollowspotArt, type FollowspotRig } from "./operator";

export type Point = { x: number; y: number };
type Context = CanvasRenderingContext2D;

type Spark = {
  born: number;
  life: number;
  origin: Point;
  x: number;
  y: number;
  size: number;
  color: string;
  glint: boolean;
};

export type SpotlightLayout = {
  width: number;
  height: number;
  link: DOMRectReadOnly;
  emitter: Point;
};

const bursts = [
  { at: 125, count: 7 },
  { at: 660, count: 11 },
  { at: 1300, count: 17 },
  { at: 1960, count: 26 },
  { at: 2780, count: 48 },
];
const chargeSchedule = { nextBurst: 0, nextSpark: 450, nextRelease: 4240 };

const between = (min: number, max: number) => min + Math.random() * (max - min);
const unit = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => {
  const t = unit(value);
  return t * t * (3 - 2 * t);
};
const tint = (color: string, percent: number) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function createSpotlight(style: CSSStyleDeclaration) {
  const white = style.getPropertyValue("--color-white").trim();
  const black = style.getPropertyValue("--color-black").trim();
  const ink = style.getPropertyValue("--color-ink").trim();
  const violet = style.getPropertyValue("--color-violet-200").trim();
  const ice = style.getPropertyValue("--color-cyan-200").trim();
  const blue = style.getPropertyValue("--color-blue-500").trim();
  const sky = style.getPropertyValue("--color-sky-300").trim();

  return {
    entryAngle: between(0.16, 0.84) * Math.PI,
    entryDistance: between(0.96, 1.39),
    facing: (Math.random() < 0.5 ? 1 : -1) as FollowspotRig["facing"],
    lampY: between(0.69, 0.82),
    palette: {
      white, black, ink, blue, sky, violet, ice,
      shadeEdge: tint(black, 16),
      shadeInner: tint(black, 70),
      hazeEdge: tint(violet, 17),
      hazeShoulder: tint(white, 81),
      hazeFar: tint(white, 32),
    },
    haze: Array.from({ length: 12 }, () => ({
      depth: between(0.14, 0.91),
      offset: between(-0.68, 0.68),
      length: between(0.035, 0.105),
      thickness: between(0.14, 0.39),
      phase: between(0, 2 * Math.PI),
    })),
    dust: Array.from({ length: 76 }, () => ({
      x: Math.random(),
      y: Math.random(),
      fall: between(12, 33),
      radius: between(0.62, 1.6),
      sway: between(5, 14),
      phase: between(0, 2 * Math.PI),
      shimmer: between(0.75, 1.6),
    })),
    sparks: [] as Spark[],
    ...chargeSchedule,
    lastBurst: -1000,
  };
}

type Spotlight = ReturnType<typeof createSpotlight>;

export function resetChargeSchedule(show: Spotlight) {
  Object.assign(show, chargeSchedule);
}

function focusRig(layout: SpotlightLayout, show: Spotlight, aim: Point, pan: Point, reveal: number): FollowspotRig {
  const { width, height } = layout;
  const { facing } = show;
  const scale = Math.min(1.16, Math.max(0.64, Math.min(width / 880, height / 600)));
  const reach = (-53 + 118 * reveal + 16 * Math.sin(Math.PI * reveal)) * scale;
  const pivot = {
    x: (facing === 1 ? 0 : width) + facing * reach - pan.x * 12 * scale,
    y: height * show.lampY - (1 - reveal) * 9 * scale - pan.y * 14 * scale,
  };
  const angle = Math.atan2(aim.y - pivot.y, aim.x - pivot.x);
  return {
    pivot, angle, facing, scale,
    lean: pan.y + pan.x * 0.37 * facing,
    lens: {
      x: pivot.x + Math.cos(angle) * followspotLens * scale,
      y: pivot.y + Math.sin(angle) * followspotLens * scale,
    },
  };
}

function drawDust(ctx: Context, layout: SpotlightLayout, show: Spotlight, lamp: Point,
  angle: number, distance: number, spread: number, age: number, opacity: number) {
  const { width, height } = layout;
  const seconds = age / 1000;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.fillStyle = show.palette.white;

  for (const grain of show.dust) {
    const worldX = grain.x * width + grain.sway * Math.sin(grain.phase + seconds * 0.7) - lamp.x;
    const worldY = (grain.y * height + seconds * grain.fall) % (height + 24) - 12 - lamp.y;
    const x = worldX * cos + worldY * sin;
    const depth = x / distance;
    if (depth <= 0.08 || depth >= 0.97) continue;
    const y = -worldX * sin + worldY * cos;
    const edge = Math.abs(y) / (spread * depth);
    if (edge >= 1) continue;
    const glint = (0.5 + 0.5 * Math.sin(grain.phase + seconds * grain.shimmer)) ** 6;
    const glow = opacity * (1 - smooth((edge - 0.35) / 0.65)) * (0.48 + 1.95 * glint);
    ctx.globalAlpha = glow * 0.22;
    ctx.beginPath();
    ctx.arc(x, y, grain.radius * 2.3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = glow;
    ctx.beginPath();
    ctx.arc(x, y, grain.radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function drawHaze(ctx: Context, layout: SpotlightLayout, show: Spotlight, lamp: Point, aim: Point, radius: number, pan: Point, age: number, opacity: number) {
  const { palette } = show;
  const dx = aim.x - lamp.x;
  const dy = aim.y - lamp.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const spread = radius * (0.74 + Math.abs(pan.y) * 0.13);
  const halfAngle = Math.atan2(spread, distance);
  const sector = halfAngle / Math.PI;
  const end = distance + radius * 0.12;
  const edge = spread * 1.24;

  ctx.save();
  ctx.translate(lamp.x, lamp.y);
  ctx.rotate(angle);

  const shaft = ctx.createConicGradient(-halfAngle, 0, 0);
  shaft.addColorStop(0, "transparent");
  shaft.addColorStop(sector * 0.10, palette.hazeEdge);
  shaft.addColorStop(sector * 0.27, palette.hazeShoulder);
  shaft.addColorStop(sector * 0.49, palette.white);
  shaft.addColorStop(sector * 0.72, palette.hazeShoulder);
  shaft.addColorStop(sector * 0.90, palette.hazeEdge);
  shaft.addColorStop(sector, "transparent");
  shaft.addColorStop(1, "transparent");
  ctx.fillStyle = shaft;
  ctx.globalAlpha = opacity;
  ctx.fillRect(0, -edge, end, edge * 2);

  for (const wisp of show.haze) {
    const drift = wisp.phase + age / 1800;
    const x = distance * wisp.depth + Math.sin(drift) * 14 + pan.x * 16 * wisp.depth;
    const y = spread * wisp.depth * wisp.offset + Math.cos(drift * 0.9) * 7 + pan.y * 23 * wisp.depth ** 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(distance * wisp.length, spread * wisp.thickness * wisp.depth);
    const haze = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    haze.addColorStop(0, palette.white);
    haze.addColorStop(1, "transparent");
    ctx.fillStyle = haze;
    ctx.globalAlpha = opacity * (0.21 + 0.13 * Math.sin(drift));
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  drawDust(ctx, layout, show, lamp, angle, distance, spread, age, opacity);

  // The airborne light dissipates where the projected pool takes over.
  const falloff = ctx.createLinearGradient(0, 0, end, 0);
  falloff.addColorStop(0, palette.white);
  falloff.addColorStop(0.28, palette.white);
  falloff.addColorStop(0.82, palette.hazeFar);
  falloff.addColorStop(1, "transparent");
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = falloff;
  ctx.fillRect(0, -edge, end, edge * 2);
  ctx.restore();
}

function drawPool(ctx: Context, layout: SpotlightLayout, aim: Point, radius: number, pan: Point, stretch: number, palette: Spotlight["palette"], opacity: number) {
  ctx.save();
  ctx.translate(aim.x, aim.y);
  ctx.rotate(Math.atan2(pan.y, pan.x));
  ctx.scale(1 + stretch, 1 - stretch * 0.44);
  const aperture = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  aperture.addColorStop(0.84, "transparent");
  aperture.addColorStop(0.89, palette.shadeEdge);
  aperture.addColorStop(0.95, palette.shadeInner);
  aperture.addColorStop(1, palette.black);
  ctx.globalCompositeOperation = "destination-over";
  ctx.globalAlpha = opacity * 0.91;
  ctx.fillStyle = aperture;
  const extent = Math.hypot(layout.width, layout.height) / 0.84;
  ctx.fillRect(-extent, -extent, extent * 2, extent * 2);
  ctx.restore();
}

function bloom(ctx: Context, point: Point, radius: number, color: string, opacity: number) {
  const light = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  light.addColorStop(0, color);
  light.addColorStop(1, "transparent");
  ctx.globalAlpha = opacity;
  ctx.fillStyle = light;
  ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
}

function shedSparks(show: Spotlight, origin: Point, age: number, count: number, charge: number) {
  for (let i = 0; i < count; i++) {
    const angle = between(0.06, 1.94) * Math.PI;
    const reach = between(31 + charge * 32, 71 + charge * 146);
    const tint = Math.random();
    const { white, sky, violet, ice } = show.palette;
    show.sparks.push({
      born: age,
      life: between(370, 650 + charge * 290),
      origin,
      x: Math.cos(angle) * reach,
      y: Math.sin(angle) * reach,
      size: Math.round(between(1.5, 2.5 + charge * 2)),
      color: tint < 0.32 ? white : tint < 0.75 ? sky : tint < 0.93 ? ice : violet,
      glint: Math.random() < 0.19 + 0.14 * charge,
    });
  }
}

function chargeSparks(show: Spotlight, origin: Point, age: number, chargeAge: number, charge: number) {
  const burst = bursts[show.nextBurst];
  if (burst && chargeAge >= burst.at) {
    shedSparks(show, origin, age, burst.count, charge);
    show.nextBurst++;
    show.lastBurst = age;
  }
  if (chargeAge >= show.nextSpark) {
    shedSparks(show, origin, age, Math.round(1 + 3 * charge), charge);
    show.nextSpark = chargeAge + between(190, 335) * (1 - charge * 0.54);
  }
  if (chargeAge >= show.nextRelease) {
    shedSparks(show, origin, age, 29, charge);
    show.nextRelease = chargeAge + between(1130, 1570);
    show.lastBurst = age;
  }
}

function drawSparks(ctx: Context, show: Spotlight, age: number, opacity: number) {
  for (let i = show.sparks.length - 1; i >= 0; i--) {
    const spark = show.sparks[i];
    const progress = (age - spark.born) / spark.life;
    if (progress >= 1) {
      show.sparks.splice(i, 1);
      continue;
    }
    const distance = 0.24 + 0.76 * (1 - (1 - progress) ** 2);
    const x = Math.round((spark.origin.x + spark.x * distance) / 2) * 2;
    const y = Math.round((spark.origin.y + spark.y * distance + 40 * progress ** 2) / 2) * 2;
    const alpha = opacity * (1 - progress) * Math.min(1, progress * 9);
    ctx.fillStyle = spark.color;
    ctx.globalAlpha = alpha * 0.23;
    ctx.fillRect(x - 2, y - 2, spark.size + 4, spark.size + 4);
    ctx.fillRect(x - spark.x * 0.038, y - spark.y * 0.038, spark.size, spark.size);
    ctx.globalAlpha = alpha;
    if (spark.glint) {
      const size = spark.size + 2 * Math.sin(Math.PI * progress);
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + 0.85, y - 0.85);
      ctx.lineTo(x + size * 0.82, y);
      ctx.lineTo(x + 0.85, y + 0.85);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - 0.85, y + 0.85);
      ctx.lineTo(x - size * 0.82, y);
      ctx.lineTo(x - 0.85, y - 0.85);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(x, y, spark.size, spark.size);
    }
  }
}

export function paintSpotlight(ctx: Context, layout: SpotlightLayout, show: Spotlight, frame: {
  age: number;
  opacity: number;
  retreat: number;
  shimmer: number;
  power: number;
  charge: number;
  chargeAge: number | null;
  reduced: boolean;
  pan: Point;
  stretch: number;
  art: FollowspotArt;
}) {
  const { width, height, link, emitter } = layout;
  const { age, opacity, retreat, shimmer, power, charge, chargeAge, reduced, pan, stretch, art } = frame;
  const { palette } = show;
  const iris = Math.min(width * 0.32, Math.max(87, 32 + Math.hypot(link.width / 2, link.height / 2 + 25) * 1.09));
  // Aim just below the control so the curved edge of the pool reads within the viewport.
  const target = {
    x: link.left + link.width / 2 + iris * pan.x * 0.24,
    y: link.top + link.height / 2 + 25 + iris * pan.y * 0.22,
  };
  const travel = reduced ? 1 : unit(age / 290);
  const t = travel - 1;
  const offset = -(2.28 * t ** 3 + 1.28 * t ** 2);
  const startX = Math.max(iris / 2, Math.min(width - iris / 2,
    target.x + Math.cos(show.entryAngle) * iris * show.entryDistance));
  const aim = {
    x: target.x + (startX - target.x) * offset - show.facing * iris * retreat * 0.31,
    y: target.y + Math.sin(show.entryAngle) * iris * show.entryDistance * offset + iris * retreat * 0.61,
  };
  const radius = iris * (1.12 - 0.12 * smooth(travel));
  if (!reduced && chargeAge !== null) chargeSparks(show, emitter, age, chargeAge, charge);
  const impact = reduced ? 0 : (1 - unit((age - show.lastBurst) / 270)) ** 2;
  const tremor = reduced ? 0 : power * charge ** 1.7 * (2.8 + 1.8 * impact);
  const jiggle = reduced ? 0 : shimmer * 0.66;
  const shake = {
    x: tremor * (Math.sin(age / 15) + 0.29 * Math.sin(age / 7)) + jiggle * Math.sin(age / 64),
    y: tremor * 0.51 * Math.cos(age / 19) + jiggle * 0.45 * Math.cos(age / 49),
    roll: tremor * 0.34 * Math.sin(age / 18) + jiggle * 0.38 * Math.sin(age / 71),
  };
  const discharge = { x: emitter.x + shake.x, y: emitter.y + shake.y };
  const reveal = reduced ? 1 : smooth(age / 375) * (1 - retreat);
  const rig = focusRig(layout, show, aim, pan, reveal);

  ctx.clearRect(0, 0, width, height);
  drawHaze(ctx, layout, show, rig.lens, aim, radius, pan, reduced ? 0 : age, opacity * 0.33);
  drawPool(ctx, layout, aim, radius, pan, stretch, palette, opacity);
  bloom(ctx, { x: aim.x, y: aim.y - 21 }, radius * 0.96, palette.white, opacity * 0.34);
  bloom(ctx, rig.pivot, 79 * rig.scale, palette.white, opacity * 0.13);
  drawFollowspotRig(ctx, rig, art, opacity);
  bloom(ctx, rig.lens, 24 * rig.scale, palette.white, opacity * 0.44);
  if (power > 0) {
    bloom(ctx, discharge, 32 + 66 * charge, palette.blue, opacity * power * (0.18 + 0.4 * charge + 0.17 * impact));
    bloom(ctx, discharge, 11 + 24 * charge, palette.ice, opacity * power * charge * (0.2 + 0.27 * impact));
  }
  if (!reduced) drawSparks(ctx, show, age, opacity * power);
  return { shake, impact };
}
