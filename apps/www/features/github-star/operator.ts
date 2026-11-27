type Point = { x: number; y: number };
type Context = CanvasRenderingContext2D;

export type FollowspotRig = {
  pivot: Point;
  lens: Point;
  angle: number;
  facing: 1 | -1;
  scale: number;
  lean: number;
};

export const followspotLens = 28;
const grip = { x: 15, y: 13 };
const housingBounds = { x: -30, y: -17, width: 65, height: 38 };

type RigColors = { black: string; ink: string; white: string; ice: string };

export type FollowspotArt = {
  housing: HTMLCanvasElement;
  actor?: HTMLCanvasElement;
};

function plate(ctx: Context, x: number, y: number, width: number, height: number, radius: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function createHousing({ black, ink, white, ice }: RigColors) {
  const canvas = document.createElement("canvas");
  const { x, y, width, height } = housingBounds;
  const ratio = 3;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(ratio, 0, 0, ratio, -x * ratio, -y * ratio);

  const silver = `color-mix(in srgb, ${white} 58%, ${ink})`;
  const steel = `color-mix(in srgb, ${white} 23%, ${ink})`;
  const gunmetal = `color-mix(in srgb, ${black} 48%, ${ink})`;
  const finish = ctx.createLinearGradient(0, -14, 0, 14);
  finish.addColorStop(0, silver);
  finish.addColorStop(0.21, steel);
  finish.addColorStop(0.46, ink);
  finish.addColorStop(0.74, gunmetal);
  finish.addColorStop(1, steel);

  // Steering handle on the audience side, with its forward collar seated in Pud's grip.
  ctx.beginPath();
  ctx.moveTo(-18, 5);
  ctx.quadraticCurveTo(-17, 14, -8, 15);
  ctx.lineTo(grip.x, grip.y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = black;
  ctx.stroke();
  ctx.lineWidth = 2.7;
  ctx.strokeStyle = steel;
  ctx.stroke();
  plate(ctx, grip.x - 4, grip.y - 3, 7, 6, 1.8, finish);

  plate(ctx, -29, -6, 7, 12, 2, gunmetal);
  plate(ctx, -26, -10, 28, 20, 4, finish);
  ctx.strokeStyle = steel;
  ctx.lineWidth = 0.75;
  ctx.stroke();
  plate(ctx, -23, -5, 17, 9, 2, gunmetal);
  for (let vent = -21; vent <= -9; vent += 3) {
    ctx.fillStyle = black;
    ctx.fillRect(vent, -4, 1.7, 7);
    ctx.fillStyle = steel;
    ctx.fillRect(vent + 1.7, -3.5, 0.55, 6);
  }
  plate(ctx, -2, -6, 21, 12, 2, finish);
  plate(ctx, -5, -10, 7, 20, 1.5, gunmetal);
  plate(ctx, -4, -8, 4, 16, 1, steel);
  plate(ctx, 1, -7, 14, 11, 1.5, ink);
  ctx.fillStyle = ice;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(3, -4, 2.2, 1.4);
  ctx.fillRect(6.5, -4, 1.5, 1.4);
  ctx.globalAlpha = 1;
  ctx.fillStyle = steel;
  ctx.fillRect(3, -0.5, 8.5, 0.7);
  ctx.fillRect(3, 1.2, 5.4, 0.7);

  // The flared objective and the concentric lens retain their center as the light pans.
  ctx.beginPath();
  ctx.moveTo(10, -6.5);
  ctx.lineTo(20, -13.5);
  ctx.quadraticCurveTo(24, -15, followspotLens, -13.5);
  ctx.lineTo(followspotLens, 13.5);
  ctx.quadraticCurveTo(24, 15, 20, 13.5);
  ctx.lineTo(10, 6.5);
  ctx.closePath();
  ctx.fillStyle = finish;
  ctx.fill();
  ctx.strokeStyle = steel;
  ctx.stroke();
  plate(ctx, 13, -9, 5, 18, 1, gunmetal);
  ctx.fillStyle = steel;
  for (let ridge = -7; ridge <= 7; ridge += 2.8) {
    ctx.fillRect(14, ridge, 3, 0.8);
  }

  ctx.beginPath();
  ctx.ellipse(followspotLens, 0, 5.7, 13.9, 0, 0, 2 * Math.PI);
  ctx.fillStyle = black;
  ctx.fill();
  ctx.lineWidth = 1.15;
  ctx.strokeStyle = silver;
  ctx.stroke();
  const glass = ctx.createLinearGradient(25, -11, 31, 11);
  glass.addColorStop(0, white);
  glass.addColorStop(0.26, ice);
  glass.addColorStop(0.63, steel);
  glass.addColorStop(1, `color-mix(in srgb, ${ice} 36%, ${ink})`);
  ctx.beginPath();
  ctx.ellipse(followspotLens + 0.6, 0, 3.9, 10.9, 0, 0, 2 * Math.PI);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.lineWidth = 0.55;
  ctx.strokeStyle = ice;
  for (const ring of [0.46, 0.74]) {
    ctx.beginPath();
    ctx.ellipse(followspotLens + 0.6, 0, 3.9 * ring, 10.9 * ring, 0, 0, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(followspotLens, 0, 1.8, 5.8, 0, 0, 2 * Math.PI);
  ctx.fillStyle = white;
  ctx.fill();
  return canvas;
}

export function loadFollowspotArt(style: CSSStyleDeclaration): FollowspotArt {
  const black = style.getPropertyValue("--color-black").trim();
  const art: FollowspotArt = {
    housing: createHousing({
      black,
      ink: style.getPropertyValue("--color-ink").trim(),
      white: style.getPropertyValue("--color-white").trim(),
      ice: style.getPropertyValue("--color-cyan-200").trim(),
    }),
  };
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const { naturalWidth: width, naturalHeight: height } = image;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    // Flag the audience side of the actor, keeping reflections facing the instrument.
    const shadow = ctx.createLinearGradient(0, height * 0.58, width, height * 0.26);
    shadow.addColorStop(0, `color-mix(in srgb, ${black} 91%, transparent)`);
    shadow.addColorStop(0.42, `color-mix(in srgb, ${black} 82%, transparent)`);
    shadow.addColorStop(0.68, `color-mix(in srgb, ${black} 63%, transparent)`);
    shadow.addColorStop(1, `color-mix(in srgb, ${black} 37%, transparent)`);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, width, height);
    art.actor = canvas;
  };
  image.src = "/pud-followspot-operator.webp";
  return art;
}

export function drawFollowspotRig(ctx: Context, rig: FollowspotRig, art: FollowspotArt, opacity: number) {
  const { facing, lean } = rig;
  const incline = Math.atan2(Math.sin(rig.angle), Math.cos(rig.angle) * facing);
  ctx.save();
  ctx.translate(rig.pivot.x, rig.pivot.y);
  ctx.scale(facing * rig.scale, rig.scale);

  ctx.save();
  ctx.rotate(incline);
  ctx.globalAlpha = opacity;
  const { x, y, width, height } = housingBounds;
  ctx.drawImage(art.housing, x, y, width, height);
  ctx.restore();

  if (art.actor) {
    const height = 84;
    const width = height * art.actor.width / art.actor.height;
    // Rotate the contact point with the fixture so the control never leaves Pud's hand.
    ctx.translate(grip.x * Math.cos(incline) - grip.y * Math.sin(incline), grip.x * Math.sin(incline) + grip.y * Math.cos(incline));
    ctx.rotate(incline * 0.15 + lean * 0.045);
    ctx.globalAlpha = opacity;
    ctx.drawImage(art.actor, -width * 0.98, -height * 0.67, width, height);
  }
  ctx.restore();
}
