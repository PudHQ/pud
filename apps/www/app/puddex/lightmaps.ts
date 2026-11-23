import { useEffect, useMemo } from "react";
import { Color, DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, type Vector3Tuple } from "three";
import { clipboard, desktopCase, desktopSurface, keyboard, lamp, mouse, mug } from "./desk-layout";

type Blocker = { position: Vector3Tuple; size: Vector3Tuple; contact?: number };
type Bounce = { position: Vector3Tuple; color: string; power: number; radius: number };
export type LightingBake = {
  position: Vector3Tuple;
  area: [number, number];
  resolution: [number, number];
  blockers: Blocker[];
  bounces: Bounce[];
  ambient: number;
};

export const deskBake: LightingBake = {
  position: [0, desktopSurface.y, desktopSurface.z],
  area: [desktopSurface.width, desktopSurface.depth],
  resolution: [176, 128],
  ambient: 0.11,
  blockers: [
    { position: [0, desktopCase.foot + desktopCase.height / 2, desktopCase.front - desktopCase.depth / 2], size: [desktopCase.width, desktopCase.height, desktopCase.depth] },
    { position: [0, 0.066, keyboard.position[2]], size: [keyboard.width, 0.129, keyboard.depth], contact: 0.57 },
    { position: [lamp.position[0], 0.057, lamp.position[2]], size: [0.47, 0.114, 0.47], contact: 0.64 },
    { position: [mug.position[0], 0.17, mug.position[2]], size: [0.36, 0.33, 0.36], contact: 0.53 },
    { position: [mouse.position[0], 0.064, mouse.position[2]], size: [0.36, 0.127, 0.53], contact: 0.44 },
    { position: [clipboard.position[0], 0.029, clipboard.position[2]], size: [0.58, 0.051, 0.80], contact: 0.53 },
    { position: [-1.43, 0.045, 2.37], size: [0.44, 0.09, 0.47], contact: 0.46 },
  ],
  bounces: [
    { position: [-2.24, 1.16, 2.23], color: "#f0c195", power: 1.06, radius: 0.61 },
    { position: [2.15, 1.64, -0.78], color: "#a9c2ca", power: 1.49, radius: 1.1 },
    { position: [0.51, 1.91, 3.1], color: "#dfc5ad", power: 0.57, radius: 0.96 },
  ],
};

const sampleOffsets = [[0, 0], [0.56, 0.26], [-0.49, -0.32], [0.22, -0.76], [-0.28, 0.85], [0.81, -0.33], [-0.78, 0.42]] as const;

function lightTexture(pixels: Uint8Array, width: number, height: number) {
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function bakeMaps({ position: [originX, baseY, originZ], area: [spanX, spanZ], resolution: [width, height], bounces, blockers, ambient }: LightingBake) {
  const light = new Uint8Array(width * height * 4);
  const occlusion = new Uint8Array(light.length);
  const boxes = blockers.map(({ position: [x, y, z], size: [w, h, d], contact = 0.65 }) => ({
    left: x - w / 2, right: x + w / 2, front: z + d / 2, back: z - d / 2,
    bottom: Math.max(0.022, y - h / 2 - baseY), top: y + h / 2 - baseY,
    reach: Math.min(spanX * 0.13, 0.08 + Math.hypot(w, d) * 0.146), contact,
  }));
  const emitters = bounces.map(({ position: [x, y, z], color, radius, power }) => ({
    dy: y - baseY, color: new Color(color), power: power / sampleOffsets.length,
    samples: sampleOffsets.map(([dx, dz]) => [x + radius * dx, z + radius * dz]),
  }));

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
      let r = ambient;
      let g = ambient;
      let b = ambient;
      let visibility = 1;
      for (const box of boxes) {
        const dx = Math.max(box.left - x, x - box.right, 0);
        const dz = Math.max(box.back - z, z - box.front, 0);
        visibility *= 1 - box.contact * Math.exp(-(dx * dx + dz * dz + box.bottom * box.bottom * 0.7) / box.reach ** 2);
      }
      for (const emitter of emitters) {
        let energy = 0;
        for (const [sx, sz] of emitter.samples) {
          const dx = sx - x || 0.00001;
          const dz = sz - z || 0.00001;
          const dy = emitter.dy;
          const distance = Math.hypot(dx, dy, dz);
          const visible = blocked(x, z, dx, dy, dz) ? 0.10 : 1;
          energy += visible * emitter.power * dy / (distance * (0.19 + distance * distance));
        }
        r += emitter.color.r * energy;
        g += emitter.color.g * energy;
        b += emitter.color.b * energy;
      }
      const offset = (row * width + column) * 4;
      light[offset] = Math.min(r, 1) * 255;
      light[offset + 1] = Math.min(g, 1) * 255;
      light[offset + 2] = Math.min(b, 1) * 255;
      light[offset + 3] = 255;
      occlusion[offset] = occlusion[offset + 1] = occlusion[offset + 2] = Math.max(0.075, visibility) * 255;
      occlusion[offset + 3] = 255;
    }
  }
  return { lightMap: lightTexture(light, width, height), aoMap: lightTexture(occlusion, width, height) };
}

export function useBakedLighting(bake: LightingBake) {
  const maps = useMemo(() => bakeMaps(bake), [bake]);
  useEffect(() => () => { maps.lightMap.dispose(); maps.aoMap.dispose(); }, [maps]);
  return maps;
}
