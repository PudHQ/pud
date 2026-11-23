import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, Float32BufferAttribute, LatheGeometry, Object3D, Vector2, type InstancedMesh } from "three";
import { Block } from "../scenes/props";
import { useSurfaceGrain } from "./surface-grain";

export const factoryFloor = -3.54;
export const conveyor = { start: -20.16, end: 20.16, y: -1.49, z: -9.15, width: 1.38 };
const length = conveyor.end - conveyor.start;
const rate = 0.72;
const sideDistance = conveyor.width / 2 + 0.11;
const slatCount = 144;
const puddingCount = 42;
const supports = Array.from({ length: 15 }, (_, index) => (index - 7) * 2.69);
const plateHeight = conveyor.y + 0.143;
const plateProfile = [[0, 0], [0.205, 0], [0.229, 0.012], [0.234, 0.029], [0.216, 0.035], [0.196, 0.018], [0, 0.018]].map(([r, y]) => new Vector2(r, y));
const flanProfile = [[0.006, 0], [0.156, 0], [0.176, 0.013], [0.184, 0.037], [0.177, 0.078], [0.151, 0.152], [0.144, 0.181], [0.129, 0.193], [0.006, 0.193]].map(([r, y]) => new Vector2(r, y));
const caramelProfile = [[0.150, 0.159], [0.152, 0.172], [0.148, 0.181], [0.141, 0.192], [0.126, 0.2], [0, 0.201]].map(([r, y]) => new Vector2(r, y));

function moldFlan() {
  const geometry = new LatheGeometry(flanProfile, 48);
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
  const geometry = new LatheGeometry(caramelProfile, 48);
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

export function Conveyor({ animate }: { animate: boolean }) {
  const slats = useRef<InstancedMesh>(null);
  const plates = useRef<InstancedMesh>(null);
  const puddings = useRef<InstancedMesh>(null);
  const caramel = useRef<InstancedMesh>(null);
  const cursor = useRef(0);
  const placement = useMemo(() => new Object3D(), []);
  const flan = useMemo(moldFlan, []);
  const glaze = useMemo(pourCaramel, []);
  const brushed = useSurfaceGrain(4, 2, true);
  useEffect(() => () => { flan.dispose(); glaze.dispose(); }, [flan, glaze]);

  useFrame((_, delta) => {
    const slatMesh = slats.current;
    const plateMesh = plates.current;
    const puddingMesh = puddings.current;
    const caramelMesh = caramel.current;
    if (!slatMesh || !plateMesh || !puddingMesh || !caramelMesh) return;
    if (animate) cursor.current = (cursor.current + Math.min(delta, 0.083) * rate) % length;
    placement.rotation.y = 0;
    for (let index = 0; index < slatCount; index++) {
      const x = conveyor.start + (index * length / slatCount + cursor.current) % length;
      placement.position.set(x, conveyor.y + 0.115, conveyor.z);
      placement.updateMatrix();
      slatMesh.setMatrixAt(index, placement.matrix);
    }
    for (let index = 0; index < puddingCount; index++) {
      const x = conveyor.start + (index * length / puddingCount + cursor.current) % length;
      const z = conveyor.z + (index % 2 ? 0.26 : -0.26);
      placement.rotation.y = index * 0.8;
      placement.position.set(x, plateHeight, z);
      placement.updateMatrix();
      plateMesh.setMatrixAt(index, placement.matrix);
      placement.position.y += 0.022;
      placement.updateMatrix();
      puddingMesh.setMatrixAt(index, placement.matrix);
      caramelMesh.setMatrixAt(index, placement.matrix);
    }
    for (const parts of [slatMesh, plateMesh, puddingMesh, caramelMesh]) parts.instanceMatrix.needsUpdate = true;
  });

  const span = conveyor.y - factoryFloor;
  return (
    <group>
      <Block size={[length, 0.226, conveyor.width]} radius={0.02} color="#3b4142" position={[0, conveyor.y - 0.012, conveyor.z]} roughness={0.87} castShadow receiveShadow />
      {[-1, 1].map(side => {
        const z = conveyor.z + side * sideDistance;
        return (
          <group key={side}>
            <Block size={[length, 0.164, 0.16]} radius={0.017} color="#686e70" position={[0, conveyor.y + 0.012, z]} metalness={0.65} roughness={0.38} castShadow receiveShadow />
            <Block size={[length, 0.036, 0.11]} radius={0.008} color="#a9adab" position={[0, conveyor.y + 0.108, z]} metalness={0.61} roughness={0.35} />
            <Block size={[length, 0.05, 0.106]} radius={0.009} color="#40484a" position={[0, conveyor.y - 0.126, z]} metalness={0.22} />
            <Instances limit={supports.length} range={supports.length}>
              <boxGeometry args={[0.106, span - 0.15, 0.126]} />
              <meshStandardMaterial color="#596264" metalness={0.51} roughness={0.55} />
              {supports.map(x => <Instance key={x} position={[x, factoryFloor + (span - 0.15) / 2 + 0.044, z]} />)}
            </Instances>
            <Instances limit={supports.length * 2} range={supports.length * 2}>
              <boxGeometry args={[0.248, 0.059, 0.242]} />
              <meshStandardMaterial color="#7e8583" metalness={0.52} roughness={0.49} />
              {supports.flatMap(x => [factoryFloor + 0.037, conveyor.y - 0.153].map(y => <Instance key={`${x}/${y}`} position={[x, y, z]} />))}
            </Instances>
            <Instances limit={supports.length} range={supports.length}>
              <cylinderGeometry args={[0.044, 0.044, 0.044, 10]} />
              <meshStandardMaterial color="#202729" metalness={0.58} roughness={0.43} />
              {supports.map(x => <Instance key={x} position={[x + 0.33, conveyor.y - 0.018, z + side * 0.083]} rotation={[Math.PI / 2, 0, 0]} />)}
            </Instances>
          </group>
        );
      })}
      <Instances limit={supports.length} range={supports.length}>
        <boxGeometry args={[0.094, 0.096, sideDistance * 2]} />
        <meshStandardMaterial color="#545d60" metalness={0.51} roughness={0.59} />
        {supports.map(x => <Instance key={x} position={[x, conveyor.y - 0.39, conveyor.z]} />)}
      </Instances>
      <instancedMesh ref={slats} args={[undefined, undefined, slatCount]} frustumCulled={false} receiveShadow>
        <boxGeometry args={[length / slatCount - 0.011, 0.036, conveyor.width]} />
        <meshStandardMaterial color="#343b3c" roughness={0.84} bumpMap={brushed} bumpScale={0.008} />
      </instancedMesh>
      <instancedMesh ref={plates} args={[undefined, undefined, puddingCount]} frustumCulled={false}>
        <latheGeometry args={[plateProfile, 20]} />
        <meshPhysicalMaterial color="#b6beb7" metalness={0.29} roughness={0.44} clearcoat={0.32} />
      </instancedMesh>
      <instancedMesh ref={puddings} args={[flan, undefined, puddingCount]} frustumCulled={false}>
        <meshPhysicalMaterial vertexColors roughness={0.24} transmission={0.23} ior={1.37} thickness={0.16}
          attenuationColor="#f69d37" attenuationDistance={0.25} clearcoat={0.92} clearcoatRoughness={0.14}
          emissive="#d27115" emissiveIntensity={0.12} />
      </instancedMesh>
      <instancedMesh ref={caramel} args={[glaze, undefined, puddingCount]} frustumCulled={false}>
        <meshPhysicalMaterial color="#b55012" roughness={0.22} clearcoat={1} clearcoatRoughness={0.115} />
      </instancedMesh>
    </group>
  );
}
