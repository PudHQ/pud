import { memo, useMemo } from "react";
import { DoubleSide, Quaternion, RepeatWrapping, Vector3, type Vector3Tuple } from "three";
import { Block, usePrint } from "@/components/scenes/props";
import { FactoryAtmosphere } from "./factory-atmosphere";
import { Conveyor } from "./factory-conveyor";
import { ControlsCabinet, Flange, Pipe, Vat } from "./factory-equipment";
import { catwalk, conveyor, conveyorDeck, factoryCeiling, factoryFloor, factoryGround, factoryLampColor, fixtures, serviceLanes, windowWorkLights } from "./factory-layout";
import { applyFactoryFog, BakedFactory } from "./factory-lighting";
import { FactoryStructure } from "./factory-structure";
import { useBakedLighting, type Bounce, type LightingBake } from "../lightmaps";

const quarter = Math.PI / 2;
const forward = new Vector3(0, 0, 1);
const vesselRows = [{ x: -6.72, z: -12.87, yaw: 0.27, reading: 0.62 }, { x: 6.44, z: -13.21, yaw: -0.22, reading: 0.71 }];

function pendantBounces(taskScale: number, rearScale: number): Bounce[] {
  return fixtures.map(({ position: [x, y, z], power, task }) => ({
    position: [x, y - 0.18, z], color: factoryLampColor, power: power * (task ? taskScale : rearScale), radius: task ? 0.54 : 0.82,
    cone: { target: [x, factoryFloor, z], angle: task ? 0.72 : 0.67, penumbra: 0.61 },
  }));
}

const floorBake: LightingBake = {
  ...factoryGround,
  resolution: [192, 116],
  ambient: 0.004,
  blockers: [
    ...vesselRows.map(({ x, z }) => ({ position: [x, factoryFloor + 1.65, z] as Vector3Tuple, size: [2.04, 3.28, 2.02] as Vector3Tuple, contact: 0.57 })),
    ...serviceLanes.map(({ x, z }) => ({ position: [x, factoryFloor + 0.4, z] as Vector3Tuple, size: [0.66, 0.8, 0.63] as Vector3Tuple, contact: 0.46 })),
    { position: [0, conveyor.y, conveyor.z], size: [conveyor.end - conveyor.start, 0.28, conveyor.width + 0.22], contact: 0.42 },
    { position: [-10.54, factoryFloor + 1.65, -17.61], size: [2.04, 3.28, 2.02], contact: 0.55 },
    { position: [10.97, factoryFloor + 1.65, -17.72], size: [2.04, 3.28, 2.02], contact: 0.55 },
    { position: [0, catwalk.y, catwalk.z], size: [catwalk.width, catwalk.thickness, catwalk.depth], contact: 0.45 },
  ],
  bounces: pendantBounces(0.71, 0.24),
};

const deckBake: LightingBake = {
  ...conveyorDeck,
  resolution: [272, 24],
  ambient: 0.005,
  blockers: floorBake.blockers,
  bounces: pendantBounces(0.26, 0.085),
};

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

function Pendant({ position }: { position: Vector3Tuple }) {
  const [, y] = position;
  const stem = factoryCeiling - y - 0.51;
  return (
    <group position={position}>
      <mesh position={[0, 0.36 + stem / 2, 0]}>
        <cylinderGeometry args={[0.037, 0.037, stem, 12]} />
        <meshStandardMaterial color="#515a5b" roughness={0.69} metalness={0.41} />
      </mesh>
      <mesh position={[0, 0.328, 0]}>
        <cylinderGeometry args={[0.103, 0.136, 0.21, 18]} />
        <meshStandardMaterial color="#5f6562" roughness={0.62} metalness={0.51} />
      </mesh>
      <Flange position={[0, 0.413, 0]} radius={0.122} />
      <mesh position={[0, 0.153, 0]}>
        <cylinderGeometry args={[0.134, 0.417, 0.315, 28, 1, true]} />
        <meshStandardMaterial color="#68716e" metalness={0.61} roughness={0.49} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.004, 0]} rotation={[quarter, 0, 0]}>
        <torusGeometry args={[0.402, 0.025, 7, 30]} />
        <meshStandardMaterial color="#a39d8c" metalness={0.67} roughness={0.38} />
      </mesh>
      <mesh position={[0, -0.016, 0]} rotation={[quarter, 0, 0]}>
        <circleGeometry args={[0.347, 28]} />
        <meshBasicMaterial color={factoryLampColor} fog={false} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.065, 0]} scale={[1, 0.64, 1]}>
        <sphereGeometry args={[0.106, 16, 12]} />
        <meshBasicMaterial color={factoryLampColor} fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WindowWorkLight({ position, target }: Pick<(typeof windowWorkLights)[number], "position" | "target">) {
  const stem = factoryCeiling - position[1];
  const aim = new Vector3(...target).sub(new Vector3(...position)).normalize();
  const rotation = new Quaternion().setFromUnitVectors(forward, aim);
  return (
    <group position={position}>
      <Block size={[0.057, stem, 0.067]} color="#4e5854" position={[0, stem / 2, -0.132]} />
      <Block size={[0.23, 0.064, 0.22]} color="#58605a" position={[0, 0.045, -0.10]} />
      <group quaternion={rotation}>
        <Block size={[0.32, 0.18, 0.145]} radius={0.016} color="#515951" position={[0, 0, -0.064]} metalness={0.39} />
        <mesh position={[0, 0, 0.010]}>
          <planeGeometry args={[0.244, 0.111]} />
          <meshBasicMaterial color={factoryLampColor} fog={false} toneMapped={false} />
        </mesh>
        {[-0.08, 0, 0.08].map(x => <Block key={x} size={[0.012, 0.124, 0.025]} color="#646354" position={[x, 0, 0.022]} />)}
      </group>
    </group>
  );
}

export const Factory = memo(function Factory({ animate }: { animate: boolean }) {
  const cachedFloor = usePrint(256, 256, drawFloor);
  const floor = useMemo(() => {
    cachedFloor.wrapS = cachedFloor.wrapT = RepeatWrapping;
    cachedFloor.repeat.set(15, 8);
    return cachedFloor;
  }, [cachedFloor]);
  const baked = useBakedLighting(floorBake);
  const deck = useBakedLighting(deckBake);

  return (
    <group>
      <mesh position={floorBake.position} rotation={[-quarter, 0, 0]}>
        <planeGeometry args={floorBake.area} />
        <meshBasicMaterial onUpdate={applyFactoryFog} map={floor} {...baked} lightMapIntensity={3.2} aoMapIntensity={0.65} color="#95a1ab" />
      </mesh>
      <BakedFactory>
        <FactoryStructure />
        {vesselRows.map(({ x, z, yaw, reading }) => (
          <group key={x}>
            <Vat position={[x, factoryFloor, z]} yaw={yaw} reading={reading} />
            <Pipe radius={0.151} points={[[x, 0.605, z], [x, 1.41, z], [x, 2.30, z], [x, 2.61, z - 0.29], [x, 2.61, -15.25]]} />
            <Flange position={[x, 1.55, z]} radius={0.197} />
            <Flange position={[x, 2.61, z - 0.85]} radius={0.195} rotation={[quarter, 0, 0]} />
          </group>
        ))}
        {[2.61, 3.056].map((y, index) => (
          <group key={y} position={[0, y, -15.25 - index * 1.4]}>
            <mesh rotation={[0, 0, quarter]}>
              <cylinderGeometry args={[0.16, 0.16, 40.95, 18]} />
              <meshStandardMaterial color={index ? "#70685c" : "#697274"} metalness={0.51} roughness={0.52} />
            </mesh>
            {[-14.3, -10.7, -6.72, -2.4, 2.4, 6.44, 10.7, 14.3].map(x => <Flange key={x} position={[x, 0, 0]} radius={0.208} rotation={[0, 0, quarter]} />)}
          </group>
        ))}
        <Vat position={[-10.54, factoryFloor, -17.61]} yaw={0.41} reading={0.59} />
        <Vat position={[10.97, factoryFloor, -17.72]} yaw={-0.41} reading={0.76} />
        <ControlsCabinet position={[-4.76, factoryFloor, -16.67]} />
        <ControlsCabinet position={[4.59, factoryFloor, -16.91]} />
        {fixtures.map(({ position }) => <Pendant key={position[2]} position={position} />)}
        {windowWorkLights.map(({ position, target }) => <WindowWorkLight key={position[0]} position={position} target={target} />)}
      </BakedFactory>
      <Conveyor animate={animate} deckLight={deck.lightMap} groundLight={baked.lightMap} />
      <FactoryAtmosphere animate={animate} />
    </group>
  );
});
