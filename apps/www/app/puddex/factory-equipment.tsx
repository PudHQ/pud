import { Instance, Instances } from "@react-three/drei";
import { useMemo } from "react";
import { CatmullRomCurve3, Vector2, Vector3, type Texture, type Vector3Tuple } from "three";
import { Block } from "../scenes/props";

const quarter = Math.PI / 2;
const steel = "#858b8b";
const galvanised = "#5e676a";
const lids = [[0.30, 3.53], [0.48, 3.48], [0.78, 3.34], [1.014, 3.181], [1.085, 3.148], [1.112, 3.122]]
  .reverse().map(([radius, height]) => new Vector2(radius, height));
const vessel = [[0.61, 0.59], [0.81, 0.64], [0.998, 0.82], [1.075, 1.02], [1.085, 2.93], [1.077, 3.06], [1.068, 3.123]]
  .map(([radius, height]) => new Vector2(radius, height));
const boltRing = Array.from({ length: 12 }, (_, index) => index * Math.PI * 2 / 12);

export function Pipe({ points, radius, color = galvanised }: { points: Vector3Tuple[]; radius: number; color?: string }) {
  const line = useMemo(() => new CatmullRomCurve3(points.map(point => new Vector3(...point))), [points]);
  return (
    <mesh>
      <tubeGeometry args={[line, 30, radius, 12, false]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.48} />
    </mesh>
  );
}

export function Flange({ position, rotation, radius }: { position: Vector3Tuple; rotation?: Vector3Tuple; radius: number }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.075, 18]} />
        <meshStandardMaterial color="#51595b" metalness={0.61} roughness={0.48} />
      </mesh>
      <mesh rotation={[quarter, 0, 0]}>
        <torusGeometry args={[radius * 0.875, 0.012, 6, 18]} />
        <meshStandardMaterial color="#7c8485" metalness={0.67} roughness={0.49} />
      </mesh>
    </group>
  );
}

export function Vat({ position, yaw, grain }: { position: Vector3Tuple; yaw: number; grain: Texture }) {
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {[-0.72, 0.72].flatMap(x => [-0.59, 0.59].map(z => (
        <group key={`${x}/${z}`} position={[x, 0, z]}>
          <Block size={[0.37, 0.062, 0.33]} radius={0.027} color="#72787a" position={[0, 0.039, 0]} metalness={0.55} />
          <mesh position={[0, 0.463, 0]}>
            <cylinderGeometry args={[0.082, 0.105, 0.865, 14]} />
            <meshStandardMaterial color={galvanised} metalness={0.62} roughness={0.55} />
          </mesh>
        </group>
      )))}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[vessel, 42]} />
        <meshStandardMaterial color={steel} metalness={0.66} roughness={0.48} bumpMap={grain} bumpScale={0.009} />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[lids, 42]} />
        <meshStandardMaterial color="#8d9494" metalness={0.68} roughness={0.45} bumpMap={grain} bumpScale={0.006} />
      </mesh>
      {[1.029, 2.82, 3.112].map((height, index) => (
        <mesh key={height} position={[0, height, 0]} rotation={[quarter, 0, 0]}>
          <torusGeometry args={[1.079, index === 2 ? 0.036 : 0.023, 8, 48]} />
          <meshStandardMaterial color={index === 1 ? "#a6a9a4" : galvanised} metalness={0.72} roughness={0.4} />
        </mesh>
      ))}
      <Instances limit={boltRing.length} range={boltRing.length}>
        <cylinderGeometry args={[0.028, 0.028, 0.059, 6]} />
        <meshStandardMaterial color="#626c6d" roughness={0.43} metalness={0.69} />
        {boltRing.map(angle => <Instance key={angle} position={[Math.cos(angle) * 1.073, 3.147, Math.sin(angle) * 1.073]} />)}
      </Instances>
      <mesh position={[0, 3.55, 0]}>
        <cylinderGeometry args={[0.313, 0.37, 0.145, 30]} />
        <meshStandardMaterial color="#555f62" roughness={0.57} metalness={0.56} />
      </mesh>
      <mesh position={[0, 3.846, 0]}>
        <cylinderGeometry args={[0.176, 0.235, 0.456, 28]} />
        <meshStandardMaterial color="#6c7472" roughness={0.44} metalness={0.62} />
      </mesh>
      {[3.689, 3.776, 3.863, 3.95, 4.04].map(height => (
        <mesh key={height} position={[0, height, 0]} rotation={[quarter, 0, 0]}>
          <torusGeometry args={[0.221 - (height - 3.68) * 0.15, 0.012, 7, 24]} />
          <meshStandardMaterial color="#4e5858" metalness={0.54} roughness={0.57} />
        </mesh>
      ))}
      <Flange position={[0, 4.122, 0]} radius={0.192} />

      <group position={[-0.16, 2.069, 1.071]}>
        <mesh>
          <torusGeometry args={[0.338, 0.039, 10, 36]} />
          <meshStandardMaterial color="#464c4e" metalness={0.62} roughness={0.49} />
        </mesh>
        <mesh position={[0, 0, 0.041]} rotation={[quarter, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.309, 0.322, 0.077, 36]} />
          <meshStandardMaterial color="#9ba09d" metalness={0.64} roughness={0.46} bumpMap={grain} bumpScale={0.006} />
        </mesh>
        <Block size={[0.058, 0.32, 0.087]} radius={0.016} color="#6e7978" position={[-0.24, 0, 0.077]} roughness={0.36} metalness={0.64} />
        <Block size={[0.162, 0.066, 0.103]} radius={0.018} color="#565e5f" position={[0.227, 0, 0.082]} roughness={0.45} metalness={0.52} />
        <Block size={[0.201, 0.077, 0.021]} radius={0.007} color="#424748" position={[0, 0.047, 0.083]} />
      </group>
      <group position={[0.699, 1.927, 0.889]}>
        <Block size={[0.132, 1.24, 0.093]} color="#50585a" radius={0.019} />
        <mesh position={[0, 0, 0.057]}>
          <cylinderGeometry args={[0.033, 0.033, 1.031, 12]} />
          <meshPhysicalMaterial color="#b49c63" roughness={0.28} clearcoat={0.66} />
        </mesh>
        {[-0.55, 0.55].map(y => <Flange key={y} position={[0, y, 0.043]} radius={0.068} />)}
      </group>
      <group position={[0.67, 3.058, 0.77]}>
        <mesh position={[0, 0.149, 0]}>
          <cylinderGeometry args={[0.041, 0.041, 0.296, 12]} />
          <meshStandardMaterial color="#8b8b7d" metalness={0.57} roughness={0.49} />
        </mesh>
        <mesh position={[0, 0.282, 0.052]} rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.151, 0.151, 0.071, 24]} />
          <meshStandardMaterial color="#4c5352" metalness={0.43} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.282, 0.093]}>
          <circleGeometry args={[0.128, 24]} />
          <meshStandardMaterial color="#b5b1a0" roughness={0.55} />
        </mesh>
        <Block size={[0.015, 0.093, 0.009]} color="#584742" position={[0.024, 0.312, 0.1]} rotation={[0, 0, -0.69]} />
      </group>
    </group>
  );
}

export function ControlsCabinet({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <Block size={[1.36, 0.193, 0.69]} color="#303b40" position={[0, 0.097, 0]} radius={0.04} />
      <Block size={[1.3, 2.21, 0.62]} color="#667070" position={[0, 1.296, 0]} radius={0.045} roughness={0.53} metalness={0.29} />
      <Block size={[1.211, 2.08, 0.05]} color="#75817f" position={[0, 1.302, 0.315]} radius={0.02} metalness={0.31} roughness={0.58} />
      <Block size={[0.89, 0.376, 0.06]} color="#333d41" position={[-0.022, 1.865, 0.339]} radius={0.02} />
      <Block size={[0.468, 0.213, 0.033]} color="#576c64" position={[-0.154, 1.868, 0.378]} radius={0.014} />
      <mesh position={[0.282, 1.922, 0.377]}>
        <sphereGeometry args={[0.036, 12, 8]} />
        <meshStandardMaterial color="#bda26d" emissive="#d4aa5c" emissiveIntensity={0.51} />
      </mesh>
      <Block size={[0.074, 0.238, 0.073]} color="#545e60" position={[0.483, 1.206, 0.365]} radius={0.017} metalness={0.45} />
      {[0.38, 0.445, 0.51, 0.575, 0.64].map(y => <Block key={y} size={[0.94, 0.018, 0.014]} color="#434e53" position={[0, y, 0.351]} />)}
    </group>
  );
}
