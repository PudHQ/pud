import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, Color, DataTexture, LinearFilter, RedFormat, RepeatWrapping, Vector2, type Texture, type Vector3Tuple } from "three";
import { factoryFloor, factoryLampColor, fixtures, serviceLanes } from "./factory-layout";

type MistBank = { position: Vector3Tuple; size: [number, number]; tint: string; density: number; seed: number; rise?: boolean };
type Air = { clouds: Texture; elapsed: { value: number } };

const banks: MistBank[] = [
  { position: [-6.3, factoryFloor + 0.62, -9.37], size: [12.4, 2.0], tint: "#9eb4c3", density: 0.63, seed: 1.8 },
  { position: [6.5, factoryFloor + 0.72, -10.35], size: [14.3, 2.27], tint: "#93aabb", density: 0.65, seed: 8.45 },
  { position: [-8.9, factoryFloor + 0.98, -14.53], size: [16.3, 2.9], tint: "#adbac2", density: 0.52, seed: 13.2 },
  { position: [8.4, factoryFloor + 0.91, -16.61], size: [16.9, 2.55], tint: "#8ea5b6", density: 0.59, seed: 17.5 },
  { position: [-4.0, factoryFloor + 1.14, -21.46], size: [25.1, 3.4], tint: "#9fadb9", density: 0.61, seed: 21.6 },
  ...serviceLanes.map(({ x, z, towardOven }, index): MistBank => ({
    position: [x - towardOven * 0.65, factoryFloor + 2.10, z + 0.32],
    size: [2.8, 3.75], tint: "#b6c4cd", density: 0.64, seed: 4.6 + index * 6.1, rise: true,
  })),
];

const airVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const mistFragment = `
uniform float elapsed;
uniform float seed;
uniform vec3 tint;
uniform float density;
uniform vec2 wind;
uniform sampler2D clouds;
varying vec2 vUv;

void main() {
  vec2 drift = vec2(seed * 0.125, seed * 0.171) + elapsed * wind;
  float billow = texture2D(clouds, vUv * vec2(0.48, 0.38) + drift).r;
  float detail = texture2D(clouds, vUv * vec2(0.82, 0.65) + drift * 1.39).r;
  vec2 centre = vUv - 0.5 + vec2((billow - 0.5) * 0.16, (detail - 0.5) * 0.11);
  float envelope = 1.0 - smoothstep(0.08, 0.48, length(centre));
  vec2 border = min(vUv, 1.0 - vUv);
  float feather = smoothstep(0.0, 0.10, min(border.x, border.y));
  float cloud = smoothstep(0.17, 0.82, billow * 0.77 + detail * 0.23);
  gl_FragColor = vec4(tint * 0.17, envelope * feather * cloud * density);
  #include <colorspace_fragment>
}`;

const shaftFragment = `
uniform float elapsed;
uniform float seed;
uniform vec3 tint;
uniform float strength;
uniform sampler2D clouds;
varying vec2 vUv;

void main() {
  float depth = 1.0 - vUv.y;
  float width = mix(0.047, 0.43, depth);
  float edge = 1.0 - smoothstep(width * 0.18, width, abs(vUv.x - 0.5));
  float ends = smoothstep(0.0, 0.055, depth) * (1.0 - smoothstep(0.36, 1.0, depth));
  float dust = texture2D(clouds, vUv * vec2(0.26, 0.40) + vec2(seed, elapsed * 0.004)).r;
  float light = edge * ends * mix(1.0, 0.48, depth) * mix(0.70, 1.0, dust) * strength;
  gl_FragColor = vec4(tint, light);
  #include <colorspace_fragment>
}`;

function smoothstep(from: number, to: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

function bakeClouds() {
  const size = 128;
  const noise = new Uint8Array(size * size);
  const octaves = [8, 16, 32].map(period => ({
    period,
    grid: Array.from({ length: period ** 2 }, (_, cell) => {
      const hash = Math.sin((cell + 1) * 127.1 + period * 311.7) * 43758.5453;
      return hash - Math.floor(hash);
    }),
  }));
  const weights = [0.67, 0.23, 0.10];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let value = 0;
      for (let octave = 0; octave < octaves.length; octave++) {
        const { period, grid } = octaves[octave];
        const u = x * period / size;
        const v = y * period / size;
        const i = Math.floor(u);
        const j = Math.floor(v);
        const next = (i + 1) % period;
        const a = j * period;
        const b = (j + 1) % period * period;
        const s = smoothstep(0, 1, u - i);
        const t = smoothstep(0, 1, v - j);
        value += weights[octave] * ((grid[a + i] * (1 - s) + grid[a + next] * s) * (1 - t) + (grid[b + i] * (1 - s) + grid[b + next] * s) * t);
      }
      noise[y * size + x] = Math.round(smoothstep(0.19, 0.79, value) * 255);
    }
  }
  const texture = new DataTexture(noise, size, size, RedFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function Mist({ position, size, tint, seed, density, rise, clouds, elapsed }: MistBank & Air) {
  const uniforms = useMemo(() => ({
    elapsed, seed: { value: seed }, tint: { value: new Color(tint) }, density: { value: density }, clouds: { value: clouds },
    wind: { value: rise ? new Vector2(0.004, -0.024) : new Vector2(0.010, -0.002) },
  }), [clouds, density, elapsed, rise, seed, tint]);
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <shaderMaterial uniforms={uniforms} vertexShader={airVertex} fragmentShader={mistFragment} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function LightShaft({ position: [x, y, z], task, clouds, elapsed }: Pick<(typeof fixtures)[number], "position" | "task"> & Air) {
  const height = y - factoryFloor;
  const uniforms = useMemo(() => ({
    elapsed, seed: { value: x }, tint: { value: new Color(factoryLampColor) }, strength: { value: task ? 0.57 : 0.135 }, clouds: { value: clouds },
  }), [clouds, elapsed, task, x]);
  return (
    <mesh position={[x, y - height / 2, z + 0.04]}>
      <planeGeometry args={[height * 0.92, height]} />
      <shaderMaterial uniforms={uniforms} vertexShader={airVertex} fragmentShader={shaftFragment} blending={AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export function FactoryAtmosphere({ animate }: { animate: boolean }) {
  const elapsed = useMemo(() => ({ value: 0 }), []);
  const clouds = useMemo(bakeClouds, []);
  useEffect(() => () => clouds.dispose(), [clouds]);
  useFrame((_, delta) => { if (animate) elapsed.value += Math.min(delta, 0.083); });
  return (
    <>
      {fixtures.map(({ position, task }) => <LightShaft key={position[2]} position={position} task={task} clouds={clouds} elapsed={elapsed} />)}
      {banks.map(bank => <Mist key={bank.seed} {...bank} clouds={clouds} elapsed={elapsed} />)}
    </>
  );
}
