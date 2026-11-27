import { useMemo } from "react";
import { CatmullRomCurve3, Shape, Vector2, Vector3, type Vector3Tuple } from "three";
import { Block } from "@/components/scenes/props";

const quarter = Math.PI / 2;
const steel = "#858b8b";
const galvanised = "#5e676a";
const lids = [[0.30, 3.53], [0.48, 3.48], [0.78, 3.34], [1.014, 3.181], [1.085, 3.148], [1.112, 3.122]]
  .reverse().map(([radius, height]) => new Vector2(radius, height));
const vessel = [[0.61, 0.59], [0.81, 0.64], [0.998, 0.82], [1.075, 1.02], [1.085, 2.93], [1.077, 3.06], [1.068, 3.123]]
  .map(([radius, height]) => new Vector2(radius, height));
const boltRing = Array.from({ length: 12 }, (_, index) => index * Math.PI * 2 / 12);
const doorBolts = Array.from({ length: 8 }, (_, index) => (index + 0.5) * Math.PI / 4);
const doorFace = [[0.324, 0], [0.326, 0.014], [0.309, 0.034], [0.269, 0.052], [0.204, 0.064], [0.11, 0.073], [0, 0.076]]
  .map(([radius, depth]) => new Vector2(radius, depth));
const gaugeSweep = Math.PI * 1.5;
const gaugeTicks = Array.from({ length: 13 }, (_, index) => ({
  angle: (0.5 - index / 12) * gaugeSweep,
  length: index % 3 === 0 ? 0.026 : 0.015,
}));
const gaugeNeedle = new Shape()
  .moveTo(-0.010, -0.036).lineTo(0.010, -0.036).lineTo(0.008, 0.025).lineTo(0, 0.115).lineTo(-0.008, 0.025).closePath();

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

function PressureDoor() {
  return (
    <group position={[-0.16, 2.069, 1.071]}>
      <mesh position={[0, 0, -0.075]} rotation={[quarter, 0, 0]}>
        <cylinderGeometry args={[0.433, 0.416, 0.24, 40]} />
        <meshStandardMaterial color="#7f8989" metalness={0.65} />
      </mesh>
      <mesh position={[0, 0, 0.044]}>
        <torusGeometry args={[0.414, 0.019, 8, 40]} />
        <meshStandardMaterial color="#afb6af" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.055]} rotation={[quarter, 0, 0]}>
        <cylinderGeometry args={[0.352, 0.352, 0.035, 40]} />
        <meshStandardMaterial color="#383e3d" roughness={0.89} />
      </mesh>
      <mesh position={[0, 0, 0.071]} rotation={[quarter, 0, 0]}>
        <latheGeometry args={[doorFace, 40]} />
        <meshStandardMaterial color="#a0a7a1" metalness={0.59} />
      </mesh>
      <mesh position={[0, 0, 0.084]}>
        <torusGeometry args={[0.322, 0.014, 8, 40]} />
        <meshStandardMaterial color="#b8bcb2" metalness={0.58} />
      </mesh>
      {doorBolts.map(angle => (
        <mesh key={angle} position={[Math.cos(angle) * 0.382, Math.sin(angle) * 0.382, 0.055]} rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.025, 0.036, 6]} />
          <meshStandardMaterial color="#505a59" metalness={0.66} />
        </mesh>
      ))}
      <mesh position={[-0.445, 0, 0.082]}>
        <cylinderGeometry args={[0.027, 0.027, 0.414, 12]} />
        <meshStandardMaterial color="#919b97" metalness={0.62} />
      </mesh>
      {[-0.144, 0.144].map(y => (
        <Block key={y} size={[0.16, 0.075, 0.098]} radius={0.014} color="#666f6e" position={[-0.389, y, 0.084]} metalness={0.6} />
      ))}
      <Block size={[0.127, 0.092, 0.13]} radius={0.016} color="#555f60" position={[0.407, 0, 0.052]} metalness={0.6} />
      <Block size={[0.13, 0.052, 0.055]} radius={0.01} color="#9fa69b" position={[0.365, 0, 0.12]} metalness={0.58} />
      <mesh position={[0, 0, 0.163]} rotation={[quarter, 0, 0]}>
        <cylinderGeometry args={[0.043, 0.074, 0.066, 18]} />
        <meshStandardMaterial color="#69726e" metalness={0.65} />
      </mesh>
      <group position={[0, 0, 0.202]}>
        <mesh>
          <torusGeometry args={[0.108, 0.021, 8, 24]} />
          <meshStandardMaterial color="#454d4b" metalness={0.66} />
        </mesh>
        {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map(angle => (
          <group key={angle} rotation={[0, 0, angle]}>
            <Block size={[0.032, 0.104, 0.027]} color="#505a57" position={[0, 0.052, 0]} metalness={0.61} />
          </group>
        ))}
        <mesh rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.048, 12]} />
          <meshStandardMaterial color="#818b85" metalness={0.62} />
        </mesh>
      </group>
    </group>
  );
}

function PressureGauge({ reading }: { reading: number }) {
  return (
    <group position={[0.52, 3.058, 0.924]}>
      <mesh position={[0, 0.151, 0.03]}>
        <cylinderGeometry args={[0.034, 0.034, 0.29, 12]} />
        <meshStandardMaterial color="#777c74" metalness={0.59} />
      </mesh>
      <mesh position={[0, 0.104, 0.03]}>
        <cylinderGeometry args={[0.051, 0.051, 0.058, 6]} />
        <meshStandardMaterial color="#9b9178" metalness={0.63} />
      </mesh>
      <group position={[0, 0.292, 0.06]}>
        <mesh rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.171, 0.163, 0.088, 32]} />
          <meshStandardMaterial color="#485253" metalness={0.55} />
        </mesh>
        <mesh position={[0, 0, 0.046]}>
          <circleGeometry args={[0.151, 32]} />
          <meshStandardMaterial color="#e0dac4" />
        </mesh>
        <mesh position={[0, 0, 0.055]}>
          <torusGeometry args={[0.158, 0.015, 9, 32]} />
          <meshStandardMaterial color="#a2aba4" metalness={0.64} />
        </mesh>
        <mesh position={[0, 0, 0.048]}>
          <ringGeometry args={[0.122, 0.138, 12, 1, -Math.PI / 4, Math.PI * 0.3]} />
          <meshStandardMaterial color="#a64d3f" />
        </mesh>
        {gaugeTicks.map(({ angle, length }) => {
          const radius = 0.132 - length / 2;
          return (
            <mesh key={angle} position={[-Math.sin(angle) * radius, Math.cos(angle) * radius, 0.049]} rotation={[0, 0, angle]}>
              <planeGeometry args={[length * 0.46, length]} />
              <meshStandardMaterial color="#37403e" />
            </mesh>
          );
        })}
        <mesh position={[0, 0, 0.055]} rotation={[0, 0, (0.5 - reading) * gaugeSweep]}>
          <shapeGeometry args={[gaugeNeedle]} />
          <meshStandardMaterial color="#a43d2e" />
        </mesh>
        <mesh position={[0, 0, 0.056]} rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.014, 12]} />
          <meshStandardMaterial color="#525854" metalness={0.49} />
        </mesh>
      </group>
    </group>
  );
}

export function Vat({ position, yaw, reading }: { position: Vector3Tuple; yaw: number; reading: number }) {
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
        <meshStandardMaterial color={steel} metalness={0.66} roughness={0.48} />
      </mesh>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[lids, 42]} />
        <meshStandardMaterial color="#8d9494" metalness={0.68} roughness={0.45} />
      </mesh>
      {[1.029, 2.82, 3.112].map((height, index) => (
        <mesh key={height} position={[0, height, 0]} rotation={[quarter, 0, 0]}>
          <torusGeometry args={[1.079, index === 2 ? 0.036 : 0.023, 8, 48]} />
          <meshStandardMaterial color={index === 1 ? "#a6a9a4" : galvanised} metalness={0.72} roughness={0.4} />
        </mesh>
      ))}
      {boltRing.map(angle => (
        <mesh key={angle} position={[Math.cos(angle) * 1.073, 3.147, Math.sin(angle) * 1.073]}>
          <cylinderGeometry args={[0.028, 0.028, 0.059, 6]} />
          <meshStandardMaterial color="#626c6d" roughness={0.43} metalness={0.69} />
        </mesh>
      ))}
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

      <PressureDoor />
      <group position={[0.699, 1.927, 0.889]}>
        <Block size={[0.132, 1.24, 0.093]} color="#50585a" radius={0.019} />
        <mesh position={[0, 0, 0.057]}>
          <cylinderGeometry args={[0.033, 0.033, 1.031, 12]} />
          <meshPhysicalMaterial color="#b49c63" roughness={0.28} clearcoat={0.66} />
        </mesh>
        {[-0.55, 0.55].map(y => <Flange key={y} position={[0, y, 0.043]} radius={0.068} />)}
      </group>
      <PressureGauge reading={reading} />
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
