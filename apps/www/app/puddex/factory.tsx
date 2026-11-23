import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, Object3D, RepeatWrapping, type ShaderMaterial, type Vector3Tuple } from "three";
import { Block, usePrint } from "../scenes/props";
import { Conveyor, conveyor, factoryFloor } from "./factory-conveyor";
import { ControlsCabinet, Flange, Pipe, Vat } from "./factory-equipment";
import { useBakedLighting, type LightingBake } from "./lightmaps";
import { useSurfaceGrain } from "./surface-grain";

const quarter = Math.PI / 2;
const ceiling = 4.30;
const girder = "#4d5658";
const vesselRows = [{ x: -6.72, z: -12.87, yaw: 0.27 }, { x: 6.44, z: -13.21, yaw: -0.22 }];
const lights = [
  { position: [-5.62, 1.65, -10.20], color: "#ffe0ad", power: 48, task: true },
  { position: [5.58, 1.69, -10.40], color: "#e5ede2", power: 53, task: true },
  { position: [-9.63, 2.49, -17.71], color: "#c0dbda", power: 33, task: false },
  { position: [8.69, 2.61, -18.1], color: "#c7ddd9", power: 34, task: false },
] satisfies { position: Vector3Tuple; color: string; power: number; task: boolean }[];

const floorBake: LightingBake = {
  position: [0, factoryFloor, -14.25],
  area: [43.4, 27.6],
  resolution: [192, 116],
  ambient: 0.08,
  blockers: [
    ...vesselRows.map(({ x, z }) => ({ position: [x, factoryFloor + 1.65, z] as Vector3Tuple, size: [2.04, 3.28, 2.02] as Vector3Tuple, contact: 0.57 })),
    { position: [0, conveyor.y, conveyor.z], size: [conveyor.end - conveyor.start, 0.28, conveyor.width + 0.22], contact: 0.42 },
    { position: [-10.54, factoryFloor + 1.65, -17.61], size: [2.04, 3.28, 2.02], contact: 0.55 },
    { position: [10.97, factoryFloor + 1.65, -17.72], size: [2.04, 3.28, 2.02], contact: 0.55 },
    { position: [0, -0.45, -19.72], size: [29.1, 0.23, 1.28], contact: 0.45 },
  ],
  bounces: lights.map(({ position, color, power }) => ({ position, color, power: power * 0.26, radius: 1.25 })),
};

const steamVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const steamFragment = `
uniform float elapsed;
uniform float seed;
uniform vec3 tint;
uniform float density;
varying vec2 vUv;

float hash(vec2 cell) {
  return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 uv) {
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
void main() {
  vec2 uv = vUv - 0.5;
  float edge = 1.0 - smoothstep(0.10, 0.58, length(uv));
  vec2 drift = vec2(elapsed * 0.058 + seed, -elapsed * 0.13);
  vec2 p = vUv * vec2(4.2, 3.5) + drift;
  float cloud = noise(p) * 0.67 + noise(p * 2.17) * 0.23 + noise(p * 4.1) * 0.10;
  gl_FragColor = vec4(tint, edge * smoothstep(0.19, 0.79, cloud) * density);
  #include <colorspace_fragment>
}`;

function Steam({ position, size, tint, seed, density, animate }: {
  position: Vector3Tuple;
  size: [number, number];
  tint: string;
  seed: number;
  density: number;
  animate: boolean;
}) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ elapsed: { value: 0 }, seed: { value: seed }, tint: { value: new Color(tint) }, density: { value: density } }), [seed, tint, density]);
  useFrame(({ clock }) => { if (material.current && animate) material.current.uniforms.elapsed.value = clock.elapsedTime; });
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={steamVertex} fragmentShader={steamFragment} transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function drawFloor(ink: CanvasRenderingContext2D) {
  ink.fillStyle = "#444848";
  ink.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const x = column * 64 + 1;
      const y = row * 64 + 1;
      const shade = 80 + ((column * 17 + row * 13 + column * row * 3) % 15);
      ink.fillStyle = `rgb(${shade} ${shade + 2} ${shade + 2})`;
      ink.fillRect(x, y, 62, 62);
      ink.fillStyle = "#ffffff16";
      ink.fillRect(x, y, 62, 1);
    }
  }
  for (let index = 0; index < 1700; index++) {
    const x = (index * 93 + index ** 2 * 11) % 256;
    const y = (index * 83 + index ** 2 * 17) % 256;
    ink.fillStyle = index % 3 ? "#2626222b" : "#acaaa629";
    ink.fillRect(x, y, 1 + index % 3, 1);
  }
}

const shaftFragment = `
uniform vec3 tint;
varying vec2 vUv;
void main() {
  float depth = 1.0 - vUv.y;
  float width = mix(0.076, 0.49, depth);
  float edge = 1.0 - smoothstep(width * 0.30, width, abs(vUv.x - 0.5));
  float density = 0.165 * edge * pow(vUv.y, 1.54) * smoothstep(0.015, 0.15, depth);
  gl_FragColor = vec4(tint, density);
  #include <colorspace_fragment>
}`;

function Pendant({ position, color, power, task }: (typeof lights)[number]) {
  const [, y] = position;
  const stem = ceiling - y - 0.51;
  const target = useMemo(() => new Object3D(), []);
  const glow = useMemo(() => ({ tint: { value: new Color(color) } }), [color]);
  return (
    <group position={position}>
      <mesh position={[0, 0.36 + stem / 2, 0]}>
        <cylinderGeometry args={[0.037, 0.037, stem, 12]} />
        <meshStandardMaterial color="#515a5b" roughness={0.69} metalness={0.41} />
      </mesh>
      <Flange position={[0, 0.357, 0]} radius={0.117} />
      <mesh position={[0, 0.153, 0]}>
        <cylinderGeometry args={[0.134, 0.417, 0.315, 28, 1, true]} />
        <meshStandardMaterial color="#68716e" metalness={0.61} roughness={0.49} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.004, 0]} rotation={[quarter, 0, 0]}>
        <torusGeometry args={[0.402, 0.025, 7, 30]} />
        <meshStandardMaterial color="#91938a" roughness={0.38} metalness={0.67} />
      </mesh>
      <mesh position={[0, -0.012, 0]} rotation={[quarter, 0, 0]}>
        <circleGeometry args={[0.347, 28]} />
        <meshBasicMaterial color={color} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.065, 0]} scale={[1, 0.64, 1]}>
        <sphereGeometry args={[0.106, 16, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.24, 0]} color={color} intensity={task ? power * 0.39 : power} distance={8.7} decay={2} />
      {task && (
        <>
          <primitive object={target} position={[0, factoryFloor - y, 0.12]} />
          <spotLight position={[0, -0.16, 0]} target={target} color={color} intensity={power * 1.06} distance={10.2} decay={2}
            angle={0.78} penumbra={0.76} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.15}
            shadow-camera-far={10.4} shadow-radius={2.8} shadow-normalBias={0.017} />
          <mesh position={[0, -2.29, 0.21]}>
            <planeGeometry args={[4.7, 4.48]} />
            <shaderMaterial uniforms={glow} vertexShader={steamVertex} fragmentShader={shaftFragment} transparent depthWrite={false} side={DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Catwalk() {
  const z = -19.72;
  const posts = Array.from({ length: 15 }, (_, index) => (index - 7) * 2.02);
  return (
    <group position={[0, -0.45, z]}>
      <Block size={[29.1, 0.223, 1.29]} radius={0.027} color="#4c575b" metalness={0.46} />
      <Block size={[29.1, 0.048, 0.099]} color="#777973" position={[0, 0.119, 0.611]} metalness={0.49} />
      {[0.49, 0.92].map(y => (
        <mesh key={y} position={[0, y, 0.606]} rotation={[0, 0, quarter]}>
          <cylinderGeometry args={[0.046, 0.046, 29.1, 10]} />
          <meshStandardMaterial color="#8e8060" roughness={0.66} metalness={0.35} />
        </mesh>
      ))}
      {posts.map(x => <Block key={x} size={[0.057, 0.907, 0.062]} color="#716b58" position={[x, 0.51, 0.606]} />)}
      {[-12.4, -6.28, 0, 6.28, 12.4].map(x => <Block key={x} size={[0.23, 2.94, 0.23]} color={girder} position={[x, -1.58, -0.456]} />)}
    </group>
  );
}

export function Factory({ animate }: { animate: boolean }) {
  const cachedFloor = usePrint(256, 256, drawFloor);
  const floor = useMemo(() => {
    cachedFloor.wrapS = cachedFloor.wrapT = RepeatWrapping;
    cachedFloor.repeat.set(15, 8);
    return cachedFloor;
  }, [cachedFloor]);
  const baked = useBakedLighting(floorBake);
  const grain = useSurfaceGrain(2, 6, true);

  return (
    <group>
      <mesh position={floorBake.position} rotation={[-quarter, 0, 0]} receiveShadow>
        <planeGeometry args={floorBake.area} />
        <meshStandardMaterial map={floor} {...baked} lightMapIntensity={1.83} aoMapIntensity={0.65}
          color="#9ca5a0" roughness={0.84} bumpMap={floor} bumpScale={0.037} />
      </mesh>
      <Block size={[43.2, 8.23, 0.46]} color="#51595c" position={[0, 0.395, -27.85]} />
      <Block size={[43.2, 0.31, 23.88]} color="#303a3e" position={[0, ceiling, -15.6]} />
      {[-21.6, 21.6].map(x => <Block key={x} size={[0.38, 7.99, 26]} color="#4d585a" position={[x, 0.42, -14.4]} />)}
      {[-7.06, -15.92, -23.4].map(z => (
        <group key={z}>
          <Block size={[43.1, 0.334, 0.269]} color={girder} position={[0, ceiling - 0.307, z]} />
          <Block size={[43.1, 0.054, 0.41]} color="#687274" position={[0, ceiling - 0.45, z]} metalness={0.36} />
          {[-17.07, -10.61, 10.61, 17.07].map(x => (
            <group key={x} position={[x, 0, z]}>
              <Block size={[0.31, 7.54, 0.365]} color={girder} position={[0, 0.23, 0]} />
              <Block size={[0.062, 7.47, 0.424]} color="#6a7373" position={[-0.174, 0.23, 0]} />
              <Block size={[0.072, 7.47, 0.422]} color="#606969" position={[0.174, 0.23, 0]} />
              <Block size={[0.57, 0.096, 0.68]} color="#525e61" position={[0, factoryFloor + 0.049, 0]} />
            </group>
          ))}
        </group>
      ))}

      <Conveyor animate={animate} />
      {vesselRows.map(({ x, z, yaw }) => (
        <group key={x}>
          <Vat position={[x, factoryFloor, z]} yaw={yaw} grain={grain} />
          <Pipe radius={0.151} points={[[x, 0.605, z], [x, 1.41, z], [x, 2.30, z], [x, 2.61, z - 0.29], [x, 2.61, -15.25]]} />
          <Flange position={[x, 1.55, z]} radius={0.197} />
          <Flange position={[x, 2.61, z - 0.85]} radius={0.195} rotation={[quarter, 0, 0]} />
        </group>
      ))}
      {[2.61, 3.056].map((y, index) => (
        <group key={y} position={[0, y, -15.25 - index * 1.4]}>
          <mesh rotation={[0, 0, quarter]}>
            <cylinderGeometry args={[0.16, 0.16, 40.95, 18]} />
            <meshStandardMaterial color={index ? "#70685c" : "#697274"} metalness={0.51} roughness={0.52} bumpMap={grain} bumpScale={0.006} />
          </mesh>
          {[-14.3, -10.7, -6.72, -2.4, 2.4, 6.44, 10.7, 14.3].map(x => <Flange key={x} position={[x, 0, 0]} radius={0.208} rotation={[0, 0, quarter]} />)}
        </group>
      ))}
      <Vat position={[-10.54, factoryFloor, -17.61]} yaw={0.41} grain={grain} />
      <Vat position={[10.97, factoryFloor, -17.72]} yaw={-0.41} grain={grain} />
      <ControlsCabinet position={[-4.76, factoryFloor, -16.67]} />
      <ControlsCabinet position={[4.59, factoryFloor, -16.91]} />
      <Catwalk />
      {lights.map(department => <Pendant key={department.position[2]} {...department} />)}
      <Steam position={[-5.8, -0.60, -11.52]} size={[7.6, 4.8]} tint="#8c8b80" density={0.37} seed={3.4} animate={animate} />
      <Steam position={[5.25, -0.48, -11.61]} size={[7.8, 5.5]} tint="#819290" density={0.45} seed={7.7} animate={animate} />
      <Steam position={[0, -0.37, -17.12]} size={[16.1, 6.4]} tint="#7b8184" density={0.67} seed={16.9} animate={animate} />
      <Steam position={[5.4, -0.44, -21.71]} size={[16.4, 6.2]} tint="#7d8588" density={0.82} seed={10.8} animate={animate} />
    </group>
  );
}
