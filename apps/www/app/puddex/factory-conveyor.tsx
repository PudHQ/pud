import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color, DataTexture, DynamicDrawUsage, Float32BufferAttribute, Frustum, LatheGeometry,
  LinearFilter, LinearSRGBColorSpace, Material, Matrix4, Mesh, Object3D, Sphere, Vector2, type Group, type InstancedMesh, type Texture,
} from "three";
import { Block } from "../scenes/props";
import { conveyor, conveyorDeck, conveyorSupports as supports, factoryFloor } from "./factory-layout";
import { applyConveyorLighting } from "./factory-lighting";
import { useSurfaceGrain } from "./surface-grain";

const length = conveyor.end - conveyor.start;
const rate = 0.72;
const sideDistance = conveyor.width / 2 + 0.11;
const slatCount = 144;
const puddingCount = 42;
const plateHeight = conveyorDeck.position[1];
const plateProfile = [[0, 0], [0.205, 0], [0.229, 0.012], [0.234, 0.029], [0.216, 0.035], [0.196, 0.018], [0, 0.018]].map(([r, y]) => new Vector2(r, y));
const flanProfile = [[0.006, 0], [0.156, 0], [0.176, 0.013], [0.184, 0.037], [0.177, 0.078], [0.151, 0.152], [0.144, 0.181], [0.129, 0.193], [0.006, 0.193]].map(([r, y]) => new Vector2(r, y));
const caramelProfile = [[0.150, 0.159], [0.152, 0.172], [0.148, 0.181], [0.141, 0.192], [0.126, 0.2], [0, 0.201]].map(([r, y]) => new Vector2(r, y));

function moldFlan() {
  const geometry = new LatheGeometry(flanProfile, 36);
  const positions = geometry.attributes.position;
  const caramelGold = new Color("#e88819");
  const custard = new Color("#ffc654");
  const shade = new Color();
  const colors: number[] = [];
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const flute = 1 - (0.5 + 0.5 * Math.cos(Math.atan2(x, z) * 12)) * 0.062 * Math.sin(Math.PI * y / 0.193);
    positions.setXYZ(index, x * flute, y, z * flute);
    shade.copy(caramelGold).lerp(custard, (y / 0.193) ** 0.59);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function pourCaramel() {
  const geometry = new LatheGeometry(caramelProfile, 28);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const theta = Math.atan2(x, z);
    const spill = Math.max(0, (0.181 - y) / 0.022) * (0.5 + 0.5 * Math.cos(theta * 5 - 0.7)) ** 6;
    positions.setXYZ(index, x * (1 + spill * 0.106), y - spill * 0.032, z * (1 + spill * 0.106));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function bakeFinish(glossy: boolean) {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    const y = (row + 0.5) * 2 / size - 1;
    for (let column = 0; column < size; column++) {
      const x = (column + 0.5) * 2 / size - 1;
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const key = Math.max(0, -0.28 * x + 0.81 * y + 0.51 * z);
      const fill = Math.max(0, 0.8 * x + 0.3 * y + 0.51 * z);
      const distance = ((x + 0.34) / 0.32) ** 2 + ((y - 0.47) / 0.15) ** 2;
      const reflection = glossy ? 0.55 * Math.exp(-distance) : 0;
      const shade = 0.20 + key * 0.43 + fill * 0.16 + reflection;
      const offset = (row * size + column) * 4;
      pixels[offset] = Math.min(shade + key * 0.065, 1) * 255;
      pixels[offset + 1] = Math.min(shade + key * 0.031, 1) * 255;
      pixels[offset + 2] = Math.min(shade + fill * 0.040, 1) * 255;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function updateFrequently(mesh: InstancedMesh) {
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
}

export function Conveyor({ animate, deckLight, groundLight }: { animate: boolean; deckLight: Texture; groundLight: Texture }) {
  const frame = useRef<Group>(null);
  const slats = useRef<InstancedMesh>(null);
  const plates = useRef<InstancedMesh>(null);
  const puddings = useRef<InstancedMesh>(null);
  const caramel = useRef<InstancedMesh>(null);
  const cursor = useRef(0);
  const lastPlacement = useRef(-1);
  const placement = useMemo(() => new Object3D(), []);
  const view = useMemo(() => ({
    clip: new Matrix4(), previousClip: new Matrix4(), frustum: new Frustum(), bounds: new Sphere(),
  }), []);
  const flan = useMemo(moldFlan, []);
  const glaze = useMemo(pourCaramel, []);
  const brushed = useSurfaceGrain(4, 2, true);
  const steelLight = useMemo(() => bakeFinish(false), []);
  const glazeLight = useMemo(() => bakeFinish(true), []);

  useLayoutEffect(() => {
    frame.current?.traverse(part => {
      if (part instanceof Mesh && part.material instanceof Material) applyConveyorLighting(part.material, deckLight, groundLight);
    });
  }, [deckLight, groundLight]);

  useEffect(() => () => {
    flan.dispose();
    glaze.dispose();
    steelLight.dispose();
    glazeLight.dispose();
  }, [flan, glaze, steelLight, glazeLight]);

  useFrame(({ camera }, delta) => {
    const slatMesh = slats.current;
    const plateMesh = plates.current;
    const puddingMesh = puddings.current;
    const caramelMesh = caramel.current;
    if (!slatMesh || !plateMesh || !puddingMesh || !caramelMesh) return;
    if (animate) cursor.current = (cursor.current + Math.min(delta, 0.083) * rate) % length;
    view.clip.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (cursor.current === lastPlacement.current && view.clip.equals(view.previousClip)) return;
    lastPlacement.current = cursor.current;
    view.previousClip.copy(view.clip);
    view.frustum.setFromProjectionMatrix(view.clip);

    // Compact the visible instances before submitting the belt and its cargo.
    let slatIndex = 0;
    placement.rotation.y = 0;
    view.bounds.radius = 0.72;
    for (let index = 0; index < slatCount; index++) {
      const x = conveyor.start + (index * length / slatCount + cursor.current) % length;
      view.bounds.center.set(x, conveyor.y + 0.115, conveyor.z);
      if (!view.frustum.intersectsSphere(view.bounds)) continue;
      placement.position.copy(view.bounds.center);
      placement.updateMatrix();
      slatMesh.setMatrixAt(slatIndex++, placement.matrix);
    }
    let dessertIndex = 0;
    view.bounds.radius = 0.28;
    for (let index = 0; index < puddingCount; index++) {
      const x = conveyor.start + (index * length / puddingCount + cursor.current) % length;
      const z = conveyor.z + (index % 2 ? 0.26 : -0.26);
      view.bounds.center.set(x, plateHeight + 0.10, z);
      if (!view.frustum.intersectsSphere(view.bounds)) continue;
      placement.rotation.y = index * 0.8;
      placement.position.set(x, plateHeight, z);
      placement.updateMatrix();
      plateMesh.setMatrixAt(dessertIndex, placement.matrix);
      placement.position.y += 0.022;
      placement.updateMatrix();
      puddingMesh.setMatrixAt(dessertIndex, placement.matrix);
      caramelMesh.setMatrixAt(dessertIndex++, placement.matrix);
    }
    slatMesh.count = slatIndex;
    plateMesh.count = puddingMesh.count = caramelMesh.count = dessertIndex;
    for (const parts of [slatMesh, plateMesh, puddingMesh, caramelMesh]) {
      if (!parts.count) continue;
      parts.instanceMatrix.clearUpdateRanges();
      parts.instanceMatrix.addUpdateRange(0, parts.count * 16);
      parts.instanceMatrix.needsUpdate = true;
    }
  });

  const span = conveyor.y - factoryFloor;
  return (
    <group ref={frame}>
      <Block size={[length, 0.226, conveyor.width]} radius={0.02} color="#3b4142" position={[0, conveyor.y - 0.012, conveyor.z]} roughness={0.87} castShadow receiveShadow />
      {[-1, 1].map(side => {
        const z = conveyor.z + side * sideDistance;
        return (
          <group key={side}>
            <Block size={[length, 0.164, 0.16]} radius={0.017} color="#686e70" position={[0, conveyor.y + 0.012, z]} metalness={0.65} roughness={0.38} castShadow receiveShadow />
            <Block size={[length, 0.036, 0.11]} radius={0.008} color="#a9adab" position={[0, conveyor.y + 0.108, z]} metalness={0.61} roughness={0.35} />
            <Block size={[length, 0.05, 0.106]} radius={0.009} color="#40484a" position={[0, conveyor.y - 0.126, z]} metalness={0.22} />
            <Instances limit={supports.length} range={supports.length} frames={1}>
              <boxGeometry args={[0.106, span - 0.15, 0.126]} />
              <meshStandardMaterial color="#596264" metalness={0.51} roughness={0.55} />
              {supports.map(x => <Instance key={x} position={[x, factoryFloor + (span - 0.15) / 2 + 0.044, z]} />)}
            </Instances>
            <Instances limit={supports.length * 2} range={supports.length * 2} frames={1}>
              <boxGeometry args={[0.248, 0.059, 0.242]} />
              <meshStandardMaterial color="#7e8583" metalness={0.52} roughness={0.49} />
              {supports.flatMap(x => [factoryFloor + 0.037, conveyor.y - 0.153].map(y => <Instance key={`${x}/${y}`} position={[x, y, z]} />))}
            </Instances>
            <Instances limit={supports.length} range={supports.length} frames={1}>
              <cylinderGeometry args={[0.044, 0.044, 0.044, 10]} />
              <meshStandardMaterial color="#202729" metalness={0.58} roughness={0.43} />
              {supports.map(x => <Instance key={x} position={[x + 0.33, conveyor.y - 0.018, z + side * 0.083]} rotation={[Math.PI / 2, 0, 0]} />)}
            </Instances>
          </group>
        );
      })}
      <Instances limit={supports.length} range={supports.length} frames={1}>
        <boxGeometry args={[0.094, 0.096, sideDistance * 2]} />
        <meshStandardMaterial color="#545d60" metalness={0.51} roughness={0.59} />
        {supports.map(x => <Instance key={x} position={[x, conveyor.y - 0.39, conveyor.z]} />)}
      </Instances>
      <instancedMesh ref={slats} args={[undefined, undefined, slatCount]} frustumCulled={false} onUpdate={updateFrequently}>
        <boxGeometry args={[length / slatCount - 0.011, 0.036, conveyor.width]} />
        <meshMatcapMaterial color="#626b6b" matcap={steelLight} bumpMap={brushed} bumpScale={0.008} />
      </instancedMesh>
      <instancedMesh ref={plates} args={[undefined, undefined, puddingCount]} frustumCulled={false} onUpdate={updateFrequently}>
        <latheGeometry args={[plateProfile, 16]} />
        <meshMatcapMaterial color="#aeb6ad" matcap={steelLight} />
      </instancedMesh>
      <instancedMesh ref={puddings} args={[flan, undefined, puddingCount]} frustumCulled={false} onUpdate={updateFrequently}>
        <meshMatcapMaterial vertexColors matcap={glazeLight} />
      </instancedMesh>
      <instancedMesh ref={caramel} args={[glaze, undefined, puddingCount]} frustumCulled={false} onUpdate={updateFrequently}>
        <meshMatcapMaterial color="#b55012" matcap={glazeLight} />
      </instancedMesh>
    </group>
  );
}
