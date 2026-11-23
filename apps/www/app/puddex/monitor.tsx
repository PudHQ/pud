import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, ExtrudeGeometry, Float32BufferAttribute, Path, Shape } from "three";
import { Block, Print, traceRoundedRect, usePrint } from "../scenes/props";
import { display, monitorStand } from "./desk-layout";
import { glassContour, traceGlass } from "./glass-profile";
import { drawBadge } from "./labels";
import { useSurfaceGrain } from "./surface-grain";

const { width, height } = display;
const vents = Array.from({ length: 16 }, (_, index) => (index - 7.5) * 0.091);
const crown = 0.043;
const controlRow = -0.782;

function drawFootShadow(ink: CanvasRenderingContext2D) {
  const edge = ink.createRadialGradient(64, 64, 43, 64, 64, 63);
  edge.addColorStop(0, "#181611ce");
  edge.addColorStop(0.62, "#1816116e");
  edge.addColorStop(1, "#18161100");
  ink.fillStyle = edge;
  ink.fillRect(0, 0, 128, 128);
}

function recessedBezel() {
  const rolls = [
    { w: 0.228, h: 0.184, z: 0.016, shade: "#c1b5a0" },
    { w: 0.196, h: 0.151, z: 0.031, shade: "#a59b89" },
    { w: 0.148, h: 0.116, z: 0.025, shade: "#918777" },
    { w: 0.066, h: 0.050, z: -0.013, shade: "#625d53" },
    { w: 0.020, h: 0.017, z: -0.022, shade: "#282923" },
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const segments = glassContour.length;
  for (let ring = 0; ring < rolls.length; ring++) {
    const { w, h, z, shade } = rolls[ring];
    const color = new Color(shade);
    for (let index = 0; index < segments; index++) {
      const [x, y] = glassContour[index];
      positions.push(x * (width + w) / 2, -y * (height + h) / 2, z);
      colors.push(color.r, color.g, color.b);
      if (ring === 0) continue;
      const inner = ring * segments + index;
      const next = ring * segments + (index + 1) % segments;
      indices.push(inner, next - segments, inner - segments, inner, next, next - segments);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function bentGlass() {
  const segments = glassContour.length;
  const layers = 16;
  const points = [0, 0, crown];
  const triangles: number[] = [];
  for (let layer = 1; layer <= layers; layer++) {
    const radius = layer / layers;
    for (let index = 0; index < segments; index++) {
      const [x, y] = glassContour[index];
      points.push(x * (width + 0.022) / 2 * radius, -y * (height + 0.02) / 2 * radius, crown * (1 - radius ** 2));
      const ring = (layer - 1) * segments + 1;
      const a = ring + index;
      const b = ring + (index + 1) % segments;
      if (layer === 1) triangles.push(0, b, a);
      else triangles.push(a - segments, b, a, a - segments, b - segments, b);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return geometry;
}

export function Monitor({ on }: { on: boolean }) {
  const badge = usePrint(384, 104, drawBadge);
  const contact = usePrint(128, 128, drawFootShadow);
  const plastic = useSurfaceGrain(3, 3);
  const parts = useMemo(() => {
    const rim = traceRoundedRect(new Shape(), 0, -0.018, width + 0.342, height + 0.307, 0.114);
    rim.holes.push(traceGlass(new Path(), width + 0.204, height + 0.158));
    const bezel = new ExtrudeGeometry(rim, { depth: 0.041, bevelThickness: 0.022, bevelSize: 0.023, bevelSegments: 5, curveSegments: 14 });
    return { bezel, trim: recessedBezel(), lens: bentGlass() };
  }, []);
  useEffect(() => () => { for (const part of Object.values(parts)) part.dispose(); }, [parts]);

  return (
    <group position={display.position}>
      <Block size={[width - 0.191, 1.233, 0.458]} radius={0.112} color="#8c8272" position={[0, 0.041, -1.061]} castShadow receiveShadow />
      <Block size={[width + 0.174, 1.529, 0.963]} radius={0.135} color="#a69e8d" position={[0, -0.007, -0.666]} castShadow receiveShadow />
      <Block size={[width + 0.351, 1.607, 0.204]} radius={0.074} color="#8b8274" position={[0, -0.021, -0.148]} castShadow receiveShadow />
      <mesh geometry={parts.bezel} position={[0, 0, -0.044]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c2b7a1" roughness={0.59} bumpMap={plastic} bumpScale={0.0024} clearcoat={0.19} />
      </mesh>
      <mesh geometry={parts.trim} castShadow receiveShadow>
        <meshPhysicalMaterial vertexColors roughness={0.56} clearcoat={0.26} clearcoatRoughness={0.45} />
      </mesh>
      <mesh geometry={parts.lens} position={[0, 0, -0.009]}>
        <meshPhysicalMaterial color="#141918" metalness={0.35} roughness={0.27} clearcoat={0.65} clearcoatRoughness={0.28} />
      </mesh>
      <mesh position={[0, monitorStand.y - monitorStand.height / 2 + 0.0015, monitorStand.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[monitorStand.width + 0.274, monitorStand.depth + 0.17]} />
        <meshBasicMaterial map={contact} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <group position={[0, monitorStand.y, monitorStand.z]} scale={[1, 1, monitorStand.depth / monitorStand.width]}>
        <mesh position={[0, -0.043, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.515, monitorStand.width / 2, 0.02, 60]} />
          <meshStandardMaterial color="#464238" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.009, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.455, 0.512, 0.088, 60]} />
          <meshPhysicalMaterial color="#a49a86" roughness={0.57} clearcoat={0.13} />
        </mesh>
        <mesh position={[0, 0.094, -0.045]} castShadow receiveShadow>
          <cylinderGeometry args={[0.211, 0.312, 0.095, 48]} />
          <meshStandardMaterial color="#7f7769" roughness={0.65} />
        </mesh>
      </group>
      <group position={[-width / 2 + 0.146, controlRow, 0]}>
        <Block size={[0.234, 0.046, 0.008]} radius={0.004} color="#635c4d" position={[0, 0, 0.023]} />
        <Print map={badge} size={[0.217, 0.038]} position={[0, 0, 0.028]} />
      </group>
      {vents.map(x => <Block key={x} size={[0.049, 0.009, 0.22]} radius={0.002} color="#71695c" position={[x, 0.746, -0.46]} />)}
      <group position={[width / 2 - 0.09, controlRow, 0]}>
        <Block size={[0.159, 0.039, 0.014]} radius={0.007} color="#898170" position={[0, 0, 0.02]} />
        {[-0.05, 0.011].map(x => (
          <Block key={x} size={[0.048, 0.022, 0.013]} radius={0.004} color="#a29884" position={[x, 0.001, 0.03]} />
        ))}
        <mesh position={[0.049, 0.002, 0.032]}>
          <sphereGeometry args={[0.008, 10, 6]} />
          <meshStandardMaterial color={on ? "#b3dfa5" : "#574f3b"} emissive="#83d879" emissiveIntensity={on ? 1.3 : 0.02} />
        </mesh>
      </group>
    </group>
  );
}
