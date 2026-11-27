import { useEffect, useMemo } from "react";
import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, MathUtils, RGBAFormat, Vector3, type Vector3Tuple } from "three";
import { clipboard, desktopCase, desktopSurface, keyboard, lamp, lampWorld, mouse, mug, officeFloor, officeSill, officeWindows } from "./office/desk-layout";
import { windowSpillColor, windowWorkLights } from "./factory/factory-layout";

type Blocker = { position: Vector3Tuple; size: Vector3Tuple; contact?: number };
export type Bounce = {
  position: Vector3Tuple;
  color: string;
  power: number;
  radius: number;
  cone?: { target: Vector3Tuple; angle: number; penumbra: number };
};
export type LightingBake = {
  position: Vector3Tuple;
  area: [number, number];
  resolution: [number, number];
  channel?: 0 | 1;
  blockers: Blocker[];
  bounces: Bounce[];
  ambient: number;
};
export type SurfaceShadows = { ambient: Uint8Array; lights: ReadonlyMap<Bounce, Uint8Array> };

export const deskLampBounces: Bounce[] = [
  { position: lampWorld.position, color: lamp.color, power: 1.45, radius: 0.15, cone: { target: lampWorld.target, angle: lamp.angle, penumbra: lamp.penumbra } },
  { position: lampWorld.position, color: "#ffb981", power: 0.69, radius: 0.53, cone: { target: lampWorld.target, angle: 1.06, penumbra: 0.90 } },
];

export const rightWallBounce = {
  position: [5.18, 1.14, 2.28] as Vector3Tuple,
  color: "#f1d4b2",
  cone: { target: [1.56, 0.16, 1.15] as Vector3Tuple, angle: 0.46, penumbra: 0.94 },
};

export const deskBake: LightingBake = {
  position: [0, desktopSurface.y, desktopSurface.z],
  area: [desktopSurface.width, desktopSurface.depth],
  resolution: [224, 160],
  ambient: 0.053,
  blockers: [
    { position: [0, desktopCase.foot + desktopCase.height / 2, desktopCase.front - desktopCase.depth / 2], size: [desktopCase.width, desktopCase.height, desktopCase.depth] },
    { position: [0, 0.066, keyboard.position[2]], size: [keyboard.width, 0.129, keyboard.depth], contact: 0.57 },
    { position: [lamp.position[0], 0.057, lamp.position[2]], size: [0.47, 0.114, 0.47], contact: 0.64 },
    { position: [mug.position[0], 0.17, mug.position[2]], size: [0.36, 0.33, 0.36], contact: 0.53 },
    { position: [mouse.position[0], 0.066, mouse.position[2]], size: [mouse.width * 0.78, 0.13, mouse.depth * 0.78], contact: 0.44 },
    { position: [clipboard.position[0], 0.029, clipboard.position[2]], size: [0.58, 0.051, 0.80], contact: 0.53 },
    { position: [-1.43, 0.045, 2.37], size: [0.44, 0.09, 0.47], contact: 0.46 },
  ],
  bounces: [
    ...deskLampBounces,
    { ...rightWallBounce, power: 1.67, radius: 0.52 },
    { position: [2.15, 1.64, -0.78], color: "#a9c2ca", power: 0.56, radius: 1.1 },
    { position: [0.51, 1.91, 3.1], color: "#dfc5ad", power: 0.32, radius: 0.96 },
  ],
};

export const officeWindowSpill: Bounce[] = windowWorkLights.map(({ position, target, power, angle }) => ({
  position, color: windowSpillColor, power, radius: 0.54,
  cone: { target, angle, penumbra: 0.88 },
}));

const windowMullions: Blocker[] = officeWindows.mullions.map(x => ({ position: [x, 1.22, officeWindows.z], size: [0.16, 3.27, 0.24], contact: 0.34 }));

export const windowSillBake: LightingBake = {
  position: [0, officeSill.y + officeSill.height / 2 + 0.002, officeWindows.z + officeSill.offset],
  area: [officeSill.width, officeSill.depth],
  resolution: [288, 16],
  channel: 1,
  ambient: 0.012,
  blockers: windowMullions,
  bounces: officeWindowSpill,
};

export const officeFloorBake: LightingBake = {
  position: [0, officeFloor.y, officeFloor.z],
  area: [officeFloor.width, officeFloor.depth],
  resolution: [160, 112],
  ambient: 0.026,
  blockers: [
    { position: [0, -0.081, desktopSurface.z], size: [desktopSurface.width + 0.07, 0.148, desktopSurface.depth + 0.07], contact: 0.45 },
    { position: [0, -0.572, officeWindows.z + 0.055], size: [9.75, 0.48, 0.41], contact: 0.33 },
    ...windowMullions,
  ],
  bounces: [
    ...officeWindowSpill,
    { position: [-0.96, 0.16, 2.32], color: lamp.color, power: 0.43, radius: 0.74 },
  ],
};

const sampleOffsets = [[0, 0], [0.56, 0.26], [-0.49, -0.32], [0.22, -0.76], [-0.28, 0.85], [0.81, -0.33], [-0.78, 0.42]] as const;

function lightTexture(pixels: Uint8Array, width: number, height: number, channel: number) {
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.channel = channel;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function bakeMaps({ position: [originX, baseY, originZ], area: [spanX, spanZ], resolution: [width, height], channel = 0, bounces, blockers, ambient }: LightingBake, shadows?: SurfaceShadows) {
  const light = new Uint8Array(width * height * 4);
  const occlusion = new Uint8Array(light.length);
  const boxes = blockers.map(({ position: [x, y, z], size: [w, h, d], contact = 0.65 }) => ({
    left: x - w / 2, right: x + w / 2, front: z + d / 2, back: z - d / 2,
    bottom: Math.max(0.022, y - h / 2 - baseY), top: y + h / 2 - baseY,
    falloff: 1 / Math.min(spanX * 0.13, 0.08 + Math.hypot(w, d) * 0.146) ** 2, contact,
  }));
  const emitters = bounces.map(bounce => {
    const { position: [x, y, z], color, radius, power, cone } = bounce;
    const dy = y - baseY;
    return {
      dy, dySquared: dy * dy, color: new Color(color), flux: power * dy / sampleOffsets.length,
      samples: sampleOffsets.map(([dx, dz]) => [x + radius * dx, z + radius * dz]),
      shadow: shadows?.lights.get(bounce),
      cone: cone && {
        axis: new Vector3(...cone.target).sub(new Vector3(x, y, z)).normalize(),
        edge: Math.cos(cone.angle),
        core: Math.cos(cone.angle * (1 - cone.penumbra)),
      },
    };
  });

  function blocked(x: number, z: number, dx: number, dy: number, dz: number) {
    for (const box of boxes) {
      const u = (box.left - x) / dx;
      const v = (box.right - x) / dx;
      const s = (box.back - z) / dz;
      const t = (box.front - z) / dz;
      const enters = Math.max(0, box.bottom / dy, Math.min(u, v), Math.min(s, t));
      const exits = Math.min(1, box.top / dy, Math.max(u, v), Math.max(s, t));
      if (enters < exits) return true;
    }
    return false;
  }

  for (let row = 0; row < height; row++) {
    const z = originZ + (0.5 - (row + 0.5) / height) * spanZ;
    for (let column = 0; column < width; column++) {
      const x = originX + ((column + 0.5) / width - 0.5) * spanX;
      const texel = row * width + column;
      let r = ambient;
      let g = ambient;
      let b = ambient;
      let visibility = shadows ? 0.43 + 0.57 * shadows.ambient[texel] / 255 : 1;
      for (const box of boxes) {
        const dx = Math.max(box.left - x, x - box.right, 0);
        const dz = Math.max(box.back - z, z - box.front, 0);
        visibility *= 1 - box.contact * Math.exp(-(dx * dx + dz * dz + box.bottom * box.bottom * 0.7) * box.falloff);
      }
      for (const emitter of emitters) {
        let energy = 0;
        const mask = emitter.shadow?.[texel];
        for (const [sx, sz] of emitter.samples) {
          const dx = sx - x || 0.00001;
          const dz = sz - z || 0.00001;
          const dy = emitter.dy;
          const distanceSquared = dx * dx + emitter.dySquared + dz * dz;
          const distance = Math.sqrt(distanceSquared);
          const cone = emitter.cone;
          const beam = cone ? MathUtils.smoothstep(-(cone.axis.x * dx + cone.axis.y * dy + cone.axis.z * dz) / distance, cone.edge, cone.core) : 1;
          if (beam === 0) continue;
          const visible = mask === undefined ? (blocked(x, z, dx, dy, dz) ? 0.10 : 1) : 0.12 + 0.88 * mask / 255;
          energy += visible * beam * emitter.flux / (distance * (0.19 + distanceSquared));
        }
        r += emitter.color.r * energy;
        g += emitter.color.g * energy;
        b += emitter.color.b * energy;
      }
      const offset = texel * 4;
      light[offset] = Math.min(r, 1) * 255;
      light[offset + 1] = Math.min(g, 1) * 255;
      light[offset + 2] = Math.min(b, 1) * 255;
      light[offset + 3] = 255;
      occlusion[offset] = occlusion[offset + 1] = occlusion[offset + 2] = Math.max(0.075, visibility) * 255;
      occlusion[offset + 3] = 255;
    }
  }
  return { lightMap: lightTexture(light, width, height, channel), aoMap: lightTexture(occlusion, width, height, channel) };
}

export function useBakedLighting(bake: LightingBake, shadows?: SurfaceShadows) {
  const maps = useMemo(() => bakeMaps(bake, shadows), [bake, shadows]);
  useEffect(() => () => { maps.lightMap.dispose(); maps.aoMap.dispose(); }, [maps]);
  return maps;
}
