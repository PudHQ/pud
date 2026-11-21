import { between, clamp, cross, texture, variants, wrap } from "./wallpaper-paint";
import type { Point, Reaction, WallpaperTap } from "./wallpaper-paint";

const brickTexture = texture("brick");
const pushTimes = variants<readonly [number, number]>([[240, 370], [410, 560], [630, 850]]);
const brickWidth = 70, brickHeight = 16;

export function brickPush({ point }: WallpaperTap): Reaction {
  // The 288×144 wallpaper has staggered 72×18 courses with two pixels of mortar.
  const row = Math.floor(point.y / 18);
  const offset = row % 2 * 36;
  const x = 1 + offset + Math.floor((point.x - offset) / 72) * 72;
  const y = 1 + row * 18;
  const image = brickTexture();
  const dust = Array.from({ length: Math.round(between(5, 11)) }, () => ({
    x: between(3, brickWidth - 3), y: between(2, brickHeight - 1), dx: between(-12, 12), dy: between(-13, 5),
  }));

  function hole(context: CanvasRenderingContext2D) {
    context.fillStyle = "#171019";
    context.fillRect(x, y, brickWidth, brickHeight);
    context.fillStyle = "#0c0b11";
    context.fillRect(x + 2, y + 1, brickWidth - 4, brickHeight - 4);
    context.fillStyle = "#35242a";
    context.fillRect(x + 2, y + brickHeight - 2, brickWidth - 5, 1);
    context.fillRect(x + 2, y + 3, 1, brickHeight - 6);
    context.fillStyle = "#221921";
    for (const grain of dust) context.fillRect(x + Math.round(grain.x), y + Math.round(grain.y), 2, 1);
  }

  return {
    duration: between(...pushTimes()),
    mark: { key: `${x}:${y}`, draw: hole },
    draw(context, progress) {
      hole(context);
      const depth = progress ** 1.65;
      const width = Math.round(brickWidth * (1 - depth * 0.73));
      const height = Math.round(brickHeight * (1 - depth * 0.68));
      const left = Math.round(x + (brickWidth - width) / 2 + (point.x - x - brickWidth / 2) * depth * 0.12);
      const top = Math.round(y + (brickHeight - height) / 2 + depth * 2);
      context.save();
      context.globalAlpha = 1 - clamp((progress - 0.43) / 0.57);
      if (image.complete && image.naturalWidth) {
        const sourceX = wrap(x, image.naturalWidth), sourceY = wrap(y, image.naturalHeight);
        const firstPiece = Math.min(brickWidth, image.naturalWidth - sourceX);
        const firstWidth = Math.round(width * firstPiece / brickWidth);
        context.drawImage(image, sourceX, sourceY, firstPiece, brickHeight, left, top, firstWidth, height);
        if (firstPiece < brickWidth && firstWidth < width) {
          context.drawImage(image, 0, sourceY, brickWidth - firstPiece, brickHeight, left + firstWidth, top, width - firstWidth, height);
        }
      } else {
        context.fillStyle = "#50302f";
        context.fillRect(left, top, width, height);
      }
      context.globalAlpha = Math.sin(progress * Math.PI) * 0.49;
      context.fillStyle = "#c69278";
      for (const grain of dust) {
        context.fillRect(x + Math.round(grain.x + grain.dx * progress), y + Math.round(grain.y + grain.dy * progress + 10 * progress ** 2), 2, 1);
      }
      context.restore();
    },
  };
}

const pinColors = variants([
  ["#eb666f", "#a62d59", "#ffd1b3"], ["#efbb5d", "#ac7040", "#fff2b1"],
  ["#7acfaa", "#337965", "#d5f8d1"], ["#82aaff", "#4d62ac", "#d2e3ff"],
  ["#bc91e8", "#754b9c", "#f1d0ff"], ["#ed94c1", "#a05182", "#ffdeec"],
  ["#ccd5df", "#707b99", "#fff5e3"], ["#fb975d", "#ad5241", "#ffe1ac"],
] as const);

export function corkPin({ point, gutter }: WallpaperTap): Reaction {
  const [enamel, shade, gloss] = pinColors();
  const left = point.x - gutter.left, right = gutter.right - point.x;
  const facing = Math.min(left, right) < 19 ? (right >= left ? 1 : -1) : (Math.random() > 0.5 ? 1 : -1);
  const squeeze = clamp((facing > 0 ? right : left) / 18, 0.28);
  const above = point.y - gutter.top, below = gutter.bottom - point.y;
  const upright = above < 17 && below > above ? -1 : 1;

  function pin(context: CanvasRenderingContext2D, lift: number) {
    context.save();
    context.translate(point.x, point.y - lift * upright);
    context.scale(facing * squeeze, upright);
    context.fillStyle = "#1b151e";
    context.fillRect(1, -2, 10, 3);
    context.fillRect(1, -5, 5, 4);
    context.fillStyle = "#ccc3c5";
    for (let step = 0; step < 7; step++) context.fillRect(step, -step, 2, 1);

    context.fillStyle = "#231722";
    context.fillRect(3, -11, 10, 7);
    context.fillRect(6, -16, 11, 7);
    context.fillStyle = shade;
    context.fillRect(4, -10, 8, 5);
    context.fillRect(8, -15, 8, 6);
    context.fillStyle = enamel;
    context.fillRect(4, -9, 6, 2);
    context.fillRect(8, -14, 7, 4);
    context.fillRect(7, -13, 6, 5);
    context.fillStyle = gloss;
    context.fillRect(8, -14, 4, 1);
    context.fillRect(4, -9, 2, 1);
    context.restore();
  }

  return {
    duration: between(270, 450),
    mark: { key: `${point.x}:${point.y}`, draw: context => pin(context, 0) },
    draw(context, progress) {
      const lift = 22 * (1 - clamp(progress / 0.63)) ** 2 - 3 * Math.sin(clamp((progress - 0.63) / 0.37) * Math.PI);
      pin(context, Math.round(lift));
      if (progress > 0.39) {
        context.save();
        context.globalAlpha = 0.52 * Math.sin(clamp((progress - 0.39) / 0.61) * Math.PI);
        context.fillStyle = "#d2a378";
        const reach = Math.round(3 + 9 * progress);
        context.fillRect(point.x - reach, point.y + 2, 2, 1);
        context.fillRect(point.x + reach, point.y - 2, 1, 2);
        context.fillRect(point.x + 2, point.y + reach / 2, 1, 1);
        context.restore();
      }
    },
  };
}

const meteors = variants([
  { core: "#fff3bd", tail: "#edbd69", ember: "#b46f7e", kind: "wish", duration: 1020, length: 215 },
  { core: "#ecffff", tail: "#81dfef", ember: "#5d80ce", kind: "comet", duration: 890, length: 260 },
  { core: "#fff0ec", tail: "#ff9167", ember: "#c15263", kind: "fireball", duration: 710, length: 235 },
  { core: "#ffe0ff", tail: "#c796f4", ember: "#6e90d9", kind: "split", duration: 1150, length: 190 },
] as const);

export function shootingStar({ point, gutter }: WallpaperTap): Reaction {
  const meteor = meteors();
  const horizontal = gutter.right - gutter.left >= gutter.bottom - gutter.top;
  const before = horizontal ? point.x - gutter.left : point.y - gutter.top;
  const after = horizontal ? gutter.right - point.x : gutter.bottom - point.y;
  const direction = before > after ? -1 : 1;
  const travel = direction * Math.min(Math.max(before, after), meteor.length * between(0.76, 1.16));
  const crossAxis = horizontal ? point.y : point.x;
  const center = horizontal ? (gutter.top + gutter.bottom) / 2 : (gutter.left + gutter.right) / 2;
  const drift = clamp(center - crossAxis, -29, 29) * between(0.38, 0.92);

  function position(progress: number) {
    const forward = travel * (1 - (1 - progress) ** 1.22);
    const across = drift * Math.sin(progress * Math.PI / 2);
    return horizontal ? { x: point.x + forward, y: point.y + across } : { x: point.x + across, y: point.y + forward };
  }

  function head(context: CanvasRenderingContext2D, x: number, y: number) {
    context.fillStyle = meteor.tail;
    cross(context, x, y, meteor.kind === "wish" ? 4 : 2);
    context.fillStyle = meteor.core;
    if (meteor.kind === "fireball") context.fillRect(x - 2, y - 1, 5, 3);
    else cross(context, x, y, 1);
  }

  return {
    duration: meteor.duration * between(0.9, 1.13),
    draw(context, progress) {
      const fade = clamp((1 - progress) * 3.4);
      context.save();
      for (let i = 27; i >= 1; i--) {
        const age = i * 0.008;
        if (progress < age) continue;
        const sample = position(progress - age);
        const x = Math.round(sample.x), y = Math.round(sample.y);
        const size = i < 7 ? 2 : 1;
        context.globalAlpha = fade * (1 - i / 30);
        context.fillStyle = i < 13 ? meteor.tail : meteor.ember;
        context.fillRect(x, y, horizontal ? size + 2 : size, horizontal ? size : size + 2);
        if ((meteor.kind === "split" || meteor.kind === "comet") && i > 4) {
          const separation = Math.round(i * 0.3);
          context.fillRect(x + (horizontal ? 0 : separation), y + (horizontal ? separation : 0), size, size);
        }
        if (i % 6 === 0 && meteor.kind !== "comet") {
          context.fillStyle = meteor.core;
          context.fillRect(x + (horizontal ? 0 : -i / 3), y + (horizontal ? -i / 3 : 0), 1, 1);
        }
      }
      context.globalAlpha = fade;
      const leading = position(progress);
      head(context, Math.round(leading.x), Math.round(leading.y));
      context.restore();
    },
    still(context) { head(context, point.x, point.y); },
  };
}

const waterTexture = texture("aquarium");
const drops = variants([
  { spread: 48, rings: 3, spray: 2, skip: false, duration: 1020 },
  { spread: 82, rings: 2, spray: 12, skip: false, duration: 1300 },
  { spread: 57, rings: 2, spray: 5, skip: true, duration: 1470 },
  { spread: 70, rings: 4, spray: 0, skip: false, duration: 1420 },
]);

export function waterRipple({ point, gutter }: WallpaperTap): Reaction {
  const drop = drops();
  const image = waterTexture();
  const aspect = between(0.56, 0.88);
  const spray = Array.from({ length: drop.spray }, () => ({ dx: between(-37, 37), dy: between(9, 30), size: Math.round(between(1, 3)) }));
  const skip = {
    x: clamp(point.x + (point.x < (gutter.left + gutter.right) / 2 ? 42 : -42), gutter.left, gutter.right),
    y: clamp(point.y + (point.y < (gutter.top + gutter.bottom) / 2 ? 13 : -13), gutter.top, gutter.bottom),
  };
  let pattern: CanvasPattern | null = null;

  function crest(context: CanvasRenderingContext2D, origin: Point, radius: number, fade: number, inside: boolean) {
    const yRadius = radius * aspect;
    const rim = Math.max(1, radius - 4);
    context.save();
    if (inside && image.complete && image.naturalWidth) {
      pattern ??= context.createPattern(image, "repeat");
      if (pattern) {
        context.save();
        context.beginPath();
        context.ellipse(origin.x, origin.y, radius, yRadius, 0, 0, Math.PI * 2);
        context.moveTo(origin.x + rim, origin.y);
        context.ellipse(origin.x, origin.y, rim, rim * aspect, 0, 0, Math.PI * 2);
        context.clip("evenodd");
        const refraction = Math.round(fade * 6);
        context.translate(refraction, -refraction);
        context.globalAlpha = fade * 0.84;
        context.fillStyle = pattern;
        context.fillRect(origin.x - radius - 8, origin.y - yRadius - 8, radius * 2 + 16, yRadius * 2 + 16);
        context.restore();
      }
    }
    context.beginPath();
    context.ellipse(origin.x, origin.y, radius, yRadius, 0, 0, Math.PI * 2);
    context.strokeStyle = "#67b1ca";
    context.globalAlpha = fade * 0.55;
    context.stroke();
    context.beginPath();
    context.ellipse(origin.x, origin.y + 1, radius, yRadius, 0, Math.PI * 0.08, Math.PI * 0.77);
    context.strokeStyle = "#b2ede1";
    context.globalAlpha = fade * 0.69;
    context.stroke();
    context.restore();
  }

  function rings(context: CanvasRenderingContext2D, origin: Point, progress: number, strength: number) {
    for (let ring = 0; ring < drop.rings; ring++) {
      const phase = progress - ring * 0.16;
      if (phase < 0 || phase > 1) continue;
      const radius = 3 + drop.spread * (1 - (1 - phase) ** 1.65) * strength;
      crest(context, origin, radius, (1 - phase) ** 1.25 * clamp((1 - progress) * 4) * strength, true);
    }
  }

  return {
    duration: drop.duration * between(0.94, 1.1),
    draw(context, progress) {
      rings(context, point, progress, 1);
      if (drop.skip && progress >= 0.27) rings(context, skip, (progress - 0.27) / 0.73, 0.71);
      const flight = clamp(progress * 2.65);
      context.save();
      context.fillStyle = "#a0ddd9";
      context.globalAlpha = (1 - flight) * 0.82;
      for (const bead of spray) {
        const height = bead.dy * 4 * flight * (1 - flight);
        const y = point.y < 22 ? point.y + height * 0.65 : point.y - height;
        context.fillRect(point.x + Math.round(bead.dx * flight), Math.round(y), bead.size, bead.size);
      }
      context.restore();
    },
    still(context) {
      crest(context, point, 8, 0.78, false);
      crest(context, point, drop.spread * 0.31, 0.6, false);
      if (drop.skip) crest(context, skip, 11, 0.53, false);
    },
  };
}
