import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, MathUtils, Path, Shape, type Group } from "three";
import { Block, Print, traceRoundedRect, usePrint } from "../scenes/props";
import { desktopCase, drive, face, powerSwitch } from "./desk-layout";
import { drawCaseBadge, drawDisk } from "./labels";
import { diskDurations, type Power } from "./machine";
import { useSurfaceGrain } from "./surface-grain";

const abs = "#c3b9a5";
const shadowPlastic = "#918577";
const rolledSteel = "#8d8d82";
const slotHeight = 0.046;
const [driveX, driveY] = drive.position;
const [buttonX, buttonY, buttonZ] = powerSwitch.position;
const around = Math.PI / 2;
const vents = [-0.894, -0.608, -0.322].flatMap(x => Array.from({ length: 5 }, (_, index) => ({ x, y: 0.158 + index * 0.045 })));

function mold(shape: Shape, depth: number, bevel: number) {
  return new ExtrudeGeometry(shape, { depth, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 5 });
}

function FloppyDisk({ power }: { power: Power }) {
  const disk = useRef<Group>(null);
  const label = usePrint(320, 168, drawDisk);

  useFrame(() => {
    if (!disk.current) return;
    const duration = diskDurations[power.disk] || 1;
    const travel = MathUtils.smoothstep(performance.now() - power.started, 0, duration);
    const inserted = power.disk === "inserting" ? travel : power.disk === "ejecting" ? 1 - travel : power.disk === "ejected" ? 0 : 1;
    disk.current.position.z = MathUtils.lerp(face + 0.012, face - 0.238, inserted);
    disk.current.visible = inserted < 0.996;
  });

  return (
    <group ref={disk} position={[driveX - 0.005, driveY, face + 0.012]} visible={power.disk === "ejected"}>
      <Block size={[0.451, 0.018, 0.445]} radius={0.006} color="#2c3030" roughness={0.7} />
      <Block size={[0.442, 0.006, 0.438]} radius={0.003} color="#373b3a" position={[0, 0.008, 0.001]} />
      <Block size={[0.213, 0.005, 0.124]} radius={0.002} color="#a8acaa" roughness={0.3} metalness={0.72} position={[0.01, 0.013, -0.157]} />
      <Block size={[0.047, 0.006, 0.084]} radius={0.002} color="#252826" position={[0.056, 0.016, -0.17]} />
      <Block size={[0.028, 0.004, 0.026]} radius={0.002} color="#171919" position={[-0.191, 0.012, 0.194]} />
      <Print size={[0.359, 0.152]} map={label} rotation={[-around, 0, 0]} position={[0, 0.012, 0.102]} />
    </group>
  );
}

function FrontPanel({ power }: { power: Power }) {
  const grain = useSurfaceGrain(3, 3);
  const badge = usePrint(420, 144, drawCaseBadge);
  const panel = useMemo(() => {
    const shell = traceRoundedRect(new Shape(), 0, 0.374, desktopCase.width + 0.024, 0.563, 0.058);
    for (const { x, y } of vents) shell.holes.push(traceRoundedRect(new Path(), x, y, 0.248, 0.036, 0.015));
    shell.holes.push(traceRoundedRect(new Path(), driveX, driveY - 0.027, 0.643, 0.187, 0.026));
    const switchHole = new Path().absarc(buttonX, buttonY, 0.096, 0, Math.PI * 2, false);
    shell.holes.push(switchHole);
    return mold(shell, 0.101, 0.007);
  }, []);
  const driveMold = useMemo(() => {
    const insert = traceRoundedRect(new Shape(), driveX, driveY - 0.027, 0.613, 0.158, 0.018);
    insert.holes.push(traceRoundedRect(new Path(), driveX, driveY, drive.width, slotHeight, 0.018));
    return mold(insert, 0.033, 0.003);
  }, []);
  useEffect(() => () => { panel.dispose(); driveMold.dispose(); }, [panel, driveMold]);

  const busy = power.disk === "booting" || power.disk === "inserting" || power.disk === "ejecting";
  return (
    <group>
      <mesh geometry={panel} position={[0, 0, face - 0.101]} castShadow receiveShadow>
        <meshPhysicalMaterial color={abs} roughness={0.57} bumpMap={grain} bumpScale={0.003} clearcoat={0.1} clearcoatRoughness={0.62} />
      </mesh>
      <Block size={[0.842, 0.247, 0.021]} color="#242624" position={[-0.61, 0.25, face - 0.094]} roughness={0.97} />
      {vents.map(({ x, y }) => (
        <Block key={`${x}/${y}`} size={[0.244, 0.009, 0.048]} radius={0.003} color="#5b5a50"
          position={[x, y - 0.011, face - 0.058]} rotation={[-0.33, 0, 0]} roughness={0.88} receiveShadow />
      ))}
      <Block size={[0.35, 0.121, 0.013]} radius={0.014} color="#887e6a" position={[-0.81, 0.526, face + 0.002]} />
      <Block size={[0.334, 0.107, 0.016]} radius={0.011} color="#555648" position={[-0.81, 0.526, face + 0.008]} />
      <Print map={badge} size={[0.31, 0.102]} position={[-0.81, 0.526, face + 0.017]} />

      <mesh geometry={driveMold} position={[0, 0, face - 0.052]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#aa9e89" roughness={0.66} bumpMap={grain} bumpScale={0.0018} />
      </mesh>
      <Block size={[0.566, 0.062, 0.015]} radius={0.005} color="#222420" position={[driveX, driveY, face - 0.078]} />
      <Block size={[0.47, 0.006, 0.013]} radius={0.001} color="#6b6458" position={[driveX, driveY + 0.013, face - 0.049]} />
      <Block size={[0.078, 0.032, 0.018]} radius={0.006} color="#776f61" position={[driveX + 0.233, driveY - 0.063, face - 0.017]} />
      <Block size={[0.064, 0.025, 0.018]} radius={0.005} color="#bcb29e" position={[driveX + 0.233, driveY - 0.062, face - 0.011]} castShadow />
      <Block size={[0.046, 0.012, 0.01]} radius={0.003} color="#605b49" position={[driveX - 0.235, driveY - 0.061, face - 0.013]} />
      <mesh position={[driveX - 0.235, driveY - 0.061, face - 0.006]}>
        <boxGeometry args={[0.035, 0.006, 0.004]} />
        <meshStandardMaterial color="#b99761" emissive="#e6a53d" emissiveIntensity={busy ? 2.1 : 0.1} />
      </mesh>

      <group position={powerSwitch.position}>
        <mesh position={[0, 0, -0.035]} rotation={[around, 0, 0]}>
          <cylinderGeometry args={[0.099, 0.099, 0.02, 36]} />
          <meshStandardMaterial color="#55534a" roughness={0.68} />
        </mesh>
        <mesh position={[0, 0, -0.015]}>
          <torusGeometry args={[0.076, 0.013, 8, 40]} />
          <meshStandardMaterial color={shadowPlastic} roughness={0.55} />
        </mesh>
        <group position={[0, 0, power.on ? -0.013 : 0.002]}>
          <mesh rotation={[around, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.064, 0.068, 0.028, 36]} />
            <meshPhysicalMaterial color="#c5baa7" roughness={0.45} clearcoat={0.18} />
          </mesh>
          <mesh position={[0, -0.002, 0.015]} rotation={[0, 0, 2.14]}>
            <torusGeometry args={[0.020, 0.002, 5, 22, 4.88]} />
            <meshStandardMaterial color="#615d50" roughness={0.8} />
          </mesh>
          <Block size={[0.004, 0.027, 0.002]} color="#615d50" position={[0, 0.012, 0.015]} />
        </group>
      </group>
      <Block size={[0.088, 0.024, 0.021]} radius={0.006} color="#827e6e" position={[buttonX, buttonY + 0.138, buttonZ - 0.014]} />
      <mesh position={[buttonX, buttonY + 0.138, buttonZ - 0.002]}>
        <boxGeometry args={[0.065, 0.009, 0.008]} />
        <meshStandardMaterial color={power.on ? "#b5d8a0" : "#586052"} emissive="#83d983" emissiveIntensity={power.on ? 1.4 : 0.01} />
      </mesh>
      <FloppyDisk power={power} />
    </group>
  );
}

export function SystemUnit({ power }: { power: Power }) {
  const { width, height, depth, front, foot } = desktopCase;
  const back = front - depth;
  const capFront = front - 0.052;
  const capDepth = capFront - back;
  const middle = (back + capFront) / 2;
  return (
    <group>
      <Block size={[width - 0.046, 0.193, capDepth]} radius={0.029} color={shadowPlastic} position={[0, foot + 0.107, middle]} castShadow receiveShadow />
      <Block size={[width, height - 0.163, capDepth]} radius={0.043} color="#b7b3a8"
        position={[0, foot + (height + 0.163) / 2, middle]} roughness={0.58} castShadow receiveShadow />
      <Block size={[width + 0.004, 0.018, capDepth - 0.014]} radius={0.004} color="#746c60" position={[0, foot + 0.173, middle + 0.01]} />
      <Block size={[width - 0.065, 0.034, 0.133]} radius={0.016} color="#8c8172" position={[0, 0.093, face - 0.033]} />
      <Block size={[width - 0.068, 0.032, 0.144]} radius={0.01} color="#c5bead" position={[0, height + foot - 0.023, face - 0.097]} receiveShadow />
      {[-1, 1].map(side => (
        <group key={side}>
          <Block size={[0.086, 0.526, 0.103]} radius={0.032} color={abs} position={[side * (width / 2 - 0.028), 0.375, face - 0.116]} castShadow receiveShadow />
          <Block size={[0.014, 0.118, 0.233]} radius={0.006} color="#777269" position={[side * (width / 2 + 0.003), 0.29, back + 0.438]} />
          <Block size={[0.021, 0.099, 0.159]} radius={0.012} color="#a9a395" position={[side * (width / 2 + 0.01), 0.29, back + 0.414]} />
          {[-0.8, 0.94].map(z => <Block key={z} size={[0.206, 0.043, 0.219]} radius={0.015} color="#35332e" position={[side * 0.875, 0.02, z]} />)}
        </group>
      ))}
      <Block size={[2.016, 0.376, 0.035]} radius={0.018} color={rolledSteel} position={[0, 0.363, back - 0.014]} roughness={0.47} metalness={0.48} />
      <Block size={[0.229, 0.15, 0.026]} radius={0.008} color="#393c38" position={[0.662, 0.399, back - 0.041]} />
      {[-0.4, -0.23].map((x, index) => (
        <mesh key={x} position={[x, 0.367, back - 0.046]} rotation={[around, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.029, 16]} />
          <meshStandardMaterial color={index ? "#6c826d" : "#766b86"} roughness={0.52} />
        </mesh>
      ))}
      <FrontPanel power={power} />
    </group>
  );
}
