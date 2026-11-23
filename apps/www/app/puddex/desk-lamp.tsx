import { useMemo } from "react";
import { CatmullRomCurve3, DoubleSide, Object3D, Quaternion, Vector2, Vector3, type Vector3Tuple } from "three";
import { Block } from "../scenes/props";
import { lamp } from "./desk-layout";
import { useSurfaceGrain } from "./surface-grain";

const quarter = Math.PI / 2;
const enamel = "#4a5748";
const brackets = "#74796d";
const up = new Vector3(0, 1, 0);
const basePin: Vector3Tuple = [-0.008, 0.142, 0.008];
const elbowPin: Vector3Tuple = [-0.108, 0.491, -0.018];
const baseTie: Vector3Tuple = [0.055, 0.14, 0.008];
const elbowTie: Vector3Tuple = [-0.045, 0.489, -0.018];
const elbowTop: Vector3Tuple = [-0.077, 0.424, -0.013];
const shadeTie: Vector3Tuple = [0.301, 0.574, 0.063];
const rimY = -0.209;
const shadeProfile = [[0.188, rimY], [0.202, -0.204], [0.206, -0.192], [0.188, -0.158], [0.132, -0.082], [0.088, -0.036], [0.057, -0.016], [0.05, -0.002]]
  .map(([r, y]) => new Vector2(r, y));
const linerProfile = [[0.191, -0.205], [0.195, -0.187], [0.177, -0.154], [0.123, -0.081], [0.07, -0.032], [0.047, -0.02]]
  .map(([r, y]) => new Vector2(r, y));

function Link({ from, to, width, color }: { from: Vector3Tuple; to: Vector3Tuple; width: number; color: string }) {
  const start = new Vector3(...from);
  const end = new Vector3(...to);
  const direction = end.clone().sub(start);
  const rotation = new Quaternion().setFromUnitVectors(up, direction.clone().normalize());
  return (
    <Block size={[width, direction.length() + width * 0.36, width * 0.93]} radius={width * 0.17}
      color={color} position={start.lerp(end, 0.5)} quaternion={rotation} roughness={0.49} metalness={0.33} castShadow receiveShadow />
  );
}

function Pivot({ position, radius = 0.032 }: { position: Vector3Tuple; radius?: number }) {
  return (
    <group position={position} rotation={[quarter, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, 0.077, 20]} />
        <meshStandardMaterial color={brackets} metalness={0.46} roughness={0.49} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[0, side * 0.044, 0]}>
          <cylinderGeometry args={[radius * 0.49, radius * 0.58, 0.013, 6]} />
          <meshStandardMaterial color="#a8a393" metalness={0.73} roughness={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function springCurve(side: number) {
  const anchor = new Vector3(-0.072, 0.105, side * 0.048);
  const pin = new Vector3(-0.113, 0.383, side * 0.048 - 0.014);
  const axis = pin.clone().sub(anchor).normalize();
  const radialX = new Vector3().crossVectors(axis, new Vector3(0, 0, 1)).normalize();
  const radialZ = new Vector3().crossVectors(axis, radialX);
  const coils = Array.from({ length: 162 }, (_, index) => {
    const t = index / 161;
    const radius = Math.min(1, t / 0.045, (1 - t) / 0.045) * 0.0138;
    const angle = t * Math.PI * 2 * 16;
    return anchor.clone().lerp(pin, t).addScaledVector(radialX, Math.cos(angle) * radius).addScaledVector(radialZ, Math.sin(angle) * radius);
  });
  return new CatmullRomCurve3(coils);
}

export function DeskLamp() {
  const target = useMemo(() => new Object3D(), []);
  const brushed = useSurfaceGrain(3, 2, true);
  const fixture = useMemo(() => {
    const pivot = new Vector3(...lamp.pivot);
    const axis = pivot.clone().sub(new Vector3(...lamp.aim)).normalize();
    const cord = new CatmullRomCurve3([
      new Vector3(-0.04, 0.048, -0.098), new Vector3(-0.045, 0.124, -0.048), new Vector3(-0.087, 0.353, -0.054),
      new Vector3(-0.145, 0.515, -0.048), new Vector3(-0.049, 0.531, -0.052), new Vector3(0.132, 0.603, -0.034),
      new Vector3(0.248, 0.636, 0.011), pivot.clone().addScaledVector(axis, 0.031),
    ]);
    return { rotation: new Quaternion().setFromUnitVectors(up, axis), source: pivot.addScaledVector(axis, rimY - 0.02), springs: [-1, 1].map(springCurve), cord };
  }, []);

  return (
    <group position={lamp.position} scale={lamp.scale}>
      <mesh position={[0, 0.014, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.188, 0.194, 0.024, 44]} />
        <meshStandardMaterial color="#262b29" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.043, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.171, 0.191, 0.053, 44]} />
        <meshPhysicalMaterial color={enamel} roughness={0.43} metalness={0.34} clearcoat={0.26} />
      </mesh>
      <mesh position={[0, 0.088, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.083, 0.043, 26]} />
        <meshStandardMaterial color={brackets} roughness={0.51} metalness={0.46} />
      </mesh>
      <Block size={[0.112, 0.054, 0.077]} color={brackets} radius={0.012} position={[0.02, 0.118, 0.008]} castShadow />
      <Block size={[0.045, 0.013, 0.033]} color="#222a26" radius={0.004} position={[0.091, 0.073, 0.074]} rotation={[0, 0.19, 0]} />
      <mesh position={[-0.028, 0.036, -0.185]} rotation={[quarter, 0, 0]}>
        <cylinderGeometry args={[0.021, 0.026, 0.052, 16]} />
        <meshStandardMaterial color="#393c35" roughness={0.79} />
      </mesh>

      <Link from={basePin} to={elbowPin} width={0.046} color={enamel} />
      <Link from={baseTie} to={elbowTie} width={0.024} color={enamel} />
      <Link from={elbowPin} to={lamp.pivot} width={0.045} color={enamel} />
      <Link from={elbowTop} to={shadeTie} width={0.023} color={enamel} />
      <Link from={elbowPin} to={elbowTie} width={0.055} color={brackets} />
      <Link from={elbowPin} to={elbowTop} width={0.044} color={brackets} />
      <Link from={lamp.pivot} to={shadeTie} width={0.047} color={brackets} />
      <Pivot position={basePin} radius={0.034} />
      <Pivot position={baseTie} radius={0.02} />
      <Pivot position={elbowPin} radius={0.037} />
      <Pivot position={elbowTop} radius={0.019} />
      <Pivot position={lamp.pivot} radius={0.031} />
      <Pivot position={shadeTie} radius={0.017} />
      <Pivot position={[-0.072, 0.105, 0]} radius={0.016} />
      <Pivot position={[-0.113, 0.383, -0.014]} radius={0.013} />
      {fixture.springs.map((spring, index) => (
        <mesh key={index} castShadow>
          <tubeGeometry args={[spring, 192, 0.0038, 7, false]} />
          <meshStandardMaterial color="#ada99b" metalness={0.65} roughness={0.37} />
        </mesh>
      ))}
      <mesh>
        <tubeGeometry args={[fixture.cord, 48, 0.0072, 8, false]} />
        <meshStandardMaterial color="#272927" roughness={0.75} />
      </mesh>

      <group position={lamp.pivot} quaternion={fixture.rotation}>
        <mesh position={[0, -0.013, 0]} castShadow>
          <cylinderGeometry args={[0.043, 0.061, 0.059, 24]} />
          <meshStandardMaterial color="#a5a293" metalness={0.7} roughness={0.38} bumpMap={brushed} bumpScale={0.001} />
        </mesh>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[shadeProfile, 52]} />
          <meshPhysicalMaterial color={enamel} roughness={0.42} metalness={0.22} clearcoat={0.52} clearcoatRoughness={0.36} side={DoubleSide} />
        </mesh>
        <mesh>
          <latheGeometry args={[linerProfile, 48]} />
          <meshStandardMaterial color="#e4d4b8" emissive="#ffc58a" emissiveIntensity={0.31} roughness={0.64} side={DoubleSide} />
        </mesh>
        <mesh position={[0, rimY, 0]} rotation={[quarter, 0, 0]}>
          <torusGeometry args={[0.194, 0.0062, 9, 52]} />
          <meshPhysicalMaterial color="#838879" roughness={0.37} metalness={0.49} clearcoat={0.32} />
        </mesh>
        <mesh position={[0, -0.058, 0]}>
          <cylinderGeometry args={[0.034, 0.036, 0.070, 20]} />
          <meshStandardMaterial color="#d0beb0" roughness={0.63} />
        </mesh>
        <mesh position={[0, -0.14, 0]} scale={[1, 1.16, 1]}>
          <sphereGeometry args={[0.056, 26, 18]} />
          <meshStandardMaterial color="#ffdeae" emissive="#ffbd75" emissiveIntensity={3.2} roughness={0.31} />
        </mesh>
      </group>
      <primitive object={target} position={lamp.aim} />
      <spotLight position={fixture.source} target={target} color="#ffc997" intensity={6.3} distance={2.8} decay={2}
        angle={0.65} penumbra={0.77} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.045}
        shadow-camera-far={3.2} shadow-radius={2.3} shadow-normalBias={0.003} />
    </group>
  );
}
