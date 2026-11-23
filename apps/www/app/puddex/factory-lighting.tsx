import { createPortal } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BufferAttribute, BufferGeometry, Color, Group, Matrix3, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Uint32BufferAttribute, Vector3, type Side, type Vector3Tuple,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const fixtures = [
  { position: [-5.62, 1.65, -10.20], color: "#ffe0ad", power: 48, task: true },
  { position: [5.58, 1.69, -10.40], color: "#e5ede2", power: 53, task: true },
  { position: [-9.63, 2.49, -17.71], color: "#c0dbda", power: 33, task: false },
  { position: [8.69, 2.61, -18.10], color: "#c7ddd9", power: 34, task: false },
] satisfies { position: Vector3Tuple; color: string; power: number; task: boolean }[];

const lamps = fixtures.map(({ position: [x, y, z], color, power, task }) => ({
  origin: new Vector3(x, y - 0.22, z),
  color: new Color(color),
  power,
  task,
}));
const upperLight = new Color("#a1b9bc");
const lowerLight = new Color("#66645a");

function makeFactoryShading() {
  const direction = new Vector3();
  const color = new Color();
  const irradiance = new Color();
  return (position: Vector3, normal: Vector3, material: MeshBasicMaterial | MeshStandardMaterial) => {
    if (!(material instanceof MeshStandardMaterial)) return material.color;
    irradiance.copy(lowerLight).lerp(upperLight, normal.y * 0.5 + 0.5);
    irradiance.multiplyScalar(0.58);
    for (const lamp of lamps) {
      direction.subVectors(lamp.origin, position);
      const distance = Math.max(direction.length(), 0.65);
      direction.divideScalar(distance);
      const facing = Math.max(0, normal.dot(direction));
      const cone = Math.min(1, Math.max(0, (direction.y - 0.69) / 0.27));
      const intensity = lamp.task ? 0.35 + 0.9 * cone * cone * (3 - 2 * cone) : 0.75;
      const range = Math.max(0, 1 - (distance / 9.5) ** 4);
      const energy = facing * intensity * lamp.power * range * range / (Math.PI * distance * distance);
      irradiance.r += lamp.color.r * energy;
      irradiance.g += lamp.color.g * energy;
      irradiance.b += lamp.color.b * energy;
    }
    irradiance.multiplyScalar(1 - material.metalness * 0.33);
    color.copy(material.color).multiply(irradiance);
    color.r += material.emissive.r * material.emissiveIntensity;
    color.g += material.emissive.g * material.emissiveIntensity;
    color.b += material.emissive.b * material.emissiveIntensity;
    return color;
  };
}

type Batch = { side: Side; toneMapped: boolean; geometries: BufferGeometry[] };

function bakeMeshes(root: Group) {
  root.updateWorldMatrix(true, true);
  const worldToRoot = root.matrixWorld.clone().invert();
  const local = new Matrix4();
  const normalMatrix = new Matrix3();
  const position = new Vector3();
  const normal = new Vector3();
  const shade = makeFactoryShading();
  const batches = new Map<string, Batch>();

  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const material = object.material;
    if (!(material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)) return;
    const { attributes, index } = object.geometry;
    const vertices = attributes.position;
    const colors = new Float32Array(vertices.count * 3);
    normalMatrix.getNormalMatrix(object.matrixWorld);
    for (let i = 0; i < vertices.count; i++) {
      position.fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld);
      normal.fromBufferAttribute(attributes.normal, i).applyNormalMatrix(normalMatrix);
      shade(position, normal, material).toArray(colors, i * 3);
    }
    local.multiplyMatrices(worldToRoot, object.matrixWorld);
    const baked = new BufferGeometry();
    baked.setAttribute("position", vertices.clone().applyMatrix4(local));
    baked.setAttribute("color", new BufferAttribute(colors, 3));
    baked.setIndex(index ?? new Uint32BufferAttribute(Uint32Array.from({ length: vertices.count }, (_, i) => i), 1));
    const { side, toneMapped } = material;
    const key = `${side}/${toneMapped}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { side, toneMapped, geometries: [] };
      batches.set(key, batch);
    }
    batch.geometries.push(baked);
  });

  return Array.from(batches.values(), ({ side, toneMapped, geometries }) => {
    const geometry = mergeGeometries(geometries);
    const material = new MeshBasicMaterial({ side, toneMapped, vertexColors: true });
    return new Mesh(geometry, material);
  });
}

// This group contains opaque factory hardware with solid material colors.
export function BakedFactory({ children }: { children: ReactNode }) {
  const source = useMemo(() => new Group(), []);
  const output = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!output.current) return;
    const target = output.current;
    const meshes = bakeMeshes(source);
    target.add(...meshes);
    return () => {
      target.remove(...meshes);
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    };
  }, [source]);
  return <>{createPortal(children, source)}<group ref={output} /></>;
}
