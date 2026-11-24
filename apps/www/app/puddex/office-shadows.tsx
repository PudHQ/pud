import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Box3, Color, DoubleSide, InstancedMesh, Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry,
  Scene, ShadowMaterial, SpotLight, WebGLRenderTarget, type Group, type Material, type Object3D, type Vector3Tuple, type WebGLRenderer,
} from "three";
import { clipboardPenAsset, deskKey, lampWorld } from "./desk-layout";
import { deskBake, deskLampBounces, officeFloorBake, officeWindowSpill, type Bounce, type LightingBake, type SurfaceShadows } from "./lightmaps";

export type OfficeShadowMaps = { desk: SurfaceShadows; floor: SurfaceShadows };
type ShadowLight = { position: Vector3Tuple; target: Vector3Tuple; angle: number; radius: number };
type Caster = { mesh: Mesh; top: number };

const overhead = { ...deskKey, angle: 0.98, radius: 6.5 };
const lamp = { ...lampWorld, angle: 1.12, radius: 4.8 };
const casterLayer = 1;

function castsShadow(material: Material) {
  return material.visible && material.depthWrite && !material.transparent && !(material instanceof MeshBasicMaterial && material.map);
}

function collectCasters(source: Group, scene: Scene, material: MeshBasicMaterial) {
  const casters: Caster[] = [];
  const bounds = new Box3();

  function visit(object: Object3D) {
    if (!object.visible || object.userData.shadowBake === false) return;
    if (object instanceof Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some(castsShadow)) {
        const mesh = object.clone(false);
        mesh.matrix.copy(object.matrixWorld);
        mesh.matrixAutoUpdate = false;
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.layers.set(casterLayer);
        scene.add(mesh);
        casters.push({ mesh, top: bounds.setFromObject(mesh).max.y });
        object.receiveShadow = true;
      }
    }
    for (const child of object.children) visit(child);
  }

  source.updateWorldMatrix(true, true);
  visit(source);
  return casters;
}

function softenWindowShadow(mask: Uint8Array, columns: number, rows: number) {
  const across = new Uint8Array(mask.length);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const texel = row * columns + column;
      const left = column === 0 ? texel : texel - 1;
      const right = column === columns - 1 ? texel : texel + 1;
      across[texel] = (mask[left] + 2 * mask[texel] + mask[right]) * 0.25;
    }
  }
  return Uint8Array.from(across, (value, texel) => {
    const above = Math.max(texel % columns, texel - columns);
    const below = Math.min(mask.length - columns + texel % columns, texel + columns);
    return (across[above] + 2 * value + across[below]) * 0.25;
  });
}

async function bakeSurface(renderer: WebGLRenderer, scene: Scene, light: SpotLight, casters: Caster[], surface: LightingBake,
  sources: { light: ShadowLight; bounces: Bounce[]; soften?: boolean }[]): Promise<SurfaceShadows> {
  const [width, depth] = surface.area;
  const [columns, rows] = surface.resolution;
  const [x, y, z] = surface.position;
  // Slabs below the receiver can bleed into the soft shadow taps at grazing angles.
  for (const { mesh, top } of casters) mesh.visible = top > y;
  const target = new WebGLRenderTarget(columns, rows);
  const receiver = new Mesh(new PlaneGeometry(width, depth), new ShadowMaterial({ color: 0x000000, toneMapped: false }));
  receiver.rotation.x = -Math.PI / 2;
  receiver.position.set(x, y, z);
  receiver.receiveShadow = true;
  scene.add(receiver);

  const camera = new OrthographicCamera(-width / 2, width / 2, depth / 2, -depth / 2, 0.01, 20);
  camera.up.set(0, 0, -1);
  camera.position.set(x, y + 9, z);
  camera.lookAt(x, y, z);

  async function trace(source: ShadowLight) {
    light.position.set(...source.position);
    light.target.position.set(...source.target);
    light.angle = source.angle;
    light.shadow.radius = source.radius;
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const rgba = new Uint8Array(columns * rows * 4);
    await renderer.readRenderTargetPixelsAsync(target, 0, 0, columns, rows, rgba);
    return Uint8Array.from({ length: columns * rows }, (_, index) => rgba[index * 4]);
  }

  try {
    // Enqueue each draw before yielding. The GPU can finish the readbacks without blocking the loader.
    const [ambient, ...masks] = await Promise.all([trace(overhead), ...sources.map(source => trace(source.light))]);
    const lights = new Map<Bounce, Uint8Array>();
    for (const [index, source] of sources.entries()) {
      const mask = masks[index];
      const visibility = source.soften ? softenWindowShadow(mask, columns, rows) : mask;
      for (const bounce of source.bounces) lights.set(bounce, visibility);
    }
    return { ambient, lights };
  } finally {
    scene.remove(receiver);
    receiver.geometry.dispose();
    receiver.material.dispose();
    target.dispose();
  }
}

async function bakeOffice(renderer: WebGLRenderer, geometry: Group): Promise<OfficeShadowMaps> {
  const scene = new Scene();
  scene.background = new Color(0xffffff);
  const casterMaterial = new MeshBasicMaterial({ side: DoubleSide });
  const casters = collectCasters(geometry, scene, casterMaterial);

  const light = new SpotLight();
  light.castShadow = true;
  // The receiver camera submits only the plane. The light still sees every caster.
  light.shadow.camera.layers.set(casterLayer);
  light.shadow.mapSize.set(768, 768);
  light.shadow.camera.near = 0.032;
  light.shadow.camera.far = 16;
  light.shadow.bias = -0.00013;
  light.shadow.normalBias = 0.0015;
  scene.add(light, light.target);

  const target = renderer.getRenderTarget();
  const cubeFace = renderer.getActiveCubeFace();
  const mipLevel = renderer.getActiveMipmapLevel();
  const { autoClear, shadowMap } = renderer;
  const autoUpdate = shadowMap.autoUpdate;
  try {
    renderer.autoClear = true;
    shadowMap.autoUpdate = true;
    const desk = bakeSurface(renderer, scene, light, casters, deskBake, [{ light: lamp, bounces: deskLampBounces }]);
    const floor = bakeSurface(renderer, scene, light, casters, officeFloorBake, officeWindowSpill.map(bounce => ({
      light: { position: bounce.position, target: bounce.cone?.target ?? officeFloorBake.position, angle: (bounce.cone?.angle ?? 0.55) + 0.18, radius: 9 },
      bounces: [bounce],
      soften: true,
    })));
    return Promise.all([desk, floor]).then(([desk, floor]) => ({ desk, floor }));
  } finally {
    renderer.setRenderTarget(target, cubeFace, mipLevel);
    renderer.autoClear = autoClear;
    shadowMap.autoUpdate = autoUpdate;
    shadowMap.needsUpdate = true;
    for (const { mesh } of casters) if (mesh instanceof InstancedMesh) mesh.dispose();
    casterMaterial.dispose();
    light.dispose();
  }
}

export function BakeOfficeShadows({ geometry, onBake }: { geometry: RefObject<Group | null>; onBake: (maps: OfficeShadowMaps) => void }) {
  useGLTF(clipboardPenAsset, false, false);
  const invalidate = useThree(state => state.invalidate);
  const pending = useRef(0);
  const generation = useRef(0);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    // Let the pen mount and the keyboard populate its instance matrices first.
    pending.current = 2;
    invalidate();
    return () => {
      pending.current = 0;
      generation.current++;
    };
  }, [invalidate]);

  useFrame(({ gl }) => {
    if (!pending.current || !geometry.current) return;
    if (--pending.current) {
      invalidate();
      return;
    }
    const version = generation.current;
    void bakeOffice(gl, geometry.current).then(
      maps => { if (version === generation.current) onBake(maps); },
      cause => { if (version === generation.current) setError(new Error("Could not bake PudDex shadows", { cause })); },
    );
  });
  if (error) throw error;
  return null;
}
