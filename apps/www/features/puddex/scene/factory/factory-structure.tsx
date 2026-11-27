import { Quaternion, Vector3, type Vector3Tuple } from "three";
import { Block } from "@/components/scenes/props";
import { Flange, Pipe } from "./factory-equipment";
import { catwalk, conveyor, conveyorSupports, factoryCeiling, factoryFloor, serviceLanes } from "./factory-layout";

const quarter = Math.PI / 2;
const girder = "#536062";
const railing = "#aa8d57";
const vertical = new Vector3(0, 1, 0);
const mainPipeY = 2.22;

function Brace({ start, end, width, color = girder }: { start: Vector3Tuple; end: Vector3Tuple; width: number; color?: string }) {
  const origin = new Vector3(...start);
  const direction = new Vector3(...end).sub(origin);
  const length = direction.length();
  const center = origin.addScaledVector(direction, 0.5);
  const rotation = new Quaternion().setFromUnitVectors(vertical, direction.normalize());
  return <Block size={[width, length, width]} color={color} position={center} quaternion={rotation} metalness={0.44} />;
}

function PipeRack({ x, towardOven }: (typeof serviceLanes)[number]) {
  const hangerDepths = [-9.74, -13.34, -17.48, -22.58];
  const tray = towardOven * 0.63;
  return (
    <group position={[x, 0, 0]}>
      {[
        { offset: 0, y: mainPipeY, radius: 0.176, color: "#656e69" },
        { offset: -towardOven * 0.47, y: 1.91, radius: 0.098, color: "#8a7356" },
      ].map(({ offset, y, radius, color }) => (
        <group key={y} position={[offset, y, 0]}>
          <mesh position={[0, 0, -16.04]} rotation={[quarter, 0, 0]}>
            <cylinderGeometry args={[radius, radius, 18.7, 18]} />
            <meshStandardMaterial color={color} roughness={0.62} metalness={0.47} />
          </mesh>
          {hangerDepths.map(z => <Flange key={z} position={[0, 0, z]} rotation={[quarter, 0, 0]} radius={radius + 0.046} />)}
        </group>
      ))}
      {[-0.19, 0.19].map(offset => (
        <Block key={offset} size={[0.046, 0.118, 18.6]} color="#566467" position={[tray + offset, 2.42, -16.04]} />
      ))}
      {Array.from({ length: 25 }, (_, index) => -7.42 - index * 0.71).map(z => (
        <Block key={z} size={[0.41, 0.048, 0.064]} color="#596568" position={[tray, 2.371, z]} />
      ))}
      {hangerDepths.map(z => (
        <group key={z} position={[0, 0, z - 0.13]}>
          <Block size={[1.55, 0.11, 0.22]} color="#687473" position={[towardOven * 0.07, 1.756, 0]} />
          <Block size={[0.175, 0.247, 0.145]} color="#66716e" position={[0, 1.931, 0]} />
          {[-0.82, 0.93].map(offset => (
            <Block key={offset} size={[0.065, factoryCeiling - 1.73, 0.075]} color="#515c5d" position={[offset * towardOven, (factoryCeiling + 1.73) / 2, 0]} />
          ))}
        </group>
      ))}
    </group>
  );
}

function ServiceRiser({ x, z, towardOven }: (typeof serviceLanes)[number]) {
  const branch = towardOven;
  const top = mainPipeY - factoryFloor;
  return (
    <group position={[x, factoryFloor, z]}>
      <Block size={[0.65, 0.14, 0.62]} color="#586464" position={[0, 0.07, 0]} />
      <Pipe radius={0.145} color="#697777" points={[[0, 0.14, 0], [0, 1.1, 0], [0, 3.55, 0], [0, top - 0.28, 0], [0, top - 0.06, -0.18], [0, top, -0.57]]} />
      {[0.34, 1.54, 2.56, 4.20].map(y => <Flange key={y} position={[0, y, 0]} radius={0.192} />)}
      <Pipe radius={0.112} color="#899088" points={[[0, 2.56, 0], [branch * 0.42, 2.56, 0], [branch * 0.65, 2.45, -0.19], [branch * 0.87, 2.35, -0.53], [branch * 1.7, 2.35, -0.67]]} />
      <Flange position={[branch * 0.34, 2.56, 0]} rotation={[0, 0, quarter]} radius={0.153} />
      <Pipe radius={0.067} color="#80775e" points={[[0, 0.70, 0.03], [-branch * 0.28, 0.70, 0.20], [-branch * 0.44, 0.81, 0.28], [-branch * 0.47, 1.12, 0.28]]} />
      <Flange position={[-branch * 0.47, 1.11, 0.28]} radius={0.107} />
      <Block size={[0.31, 0.21, 0.32]} color="#465051" position={[0, 2.14, 0.08]} />
      <group position={[0, 2.14, 0.32]}>
        <mesh>
          <torusGeometry args={[0.168, 0.024, 8, 24]} />
          <meshStandardMaterial color="#ad563d" metalness={0.46} />
        </mesh>
        {[0, Math.PI / 3, Math.PI * 2 / 3].map(angle => (
          <Block key={angle} size={[0.034, 0.305, 0.032]} color="#91503d" rotation={[0, 0, angle]} />
        ))}
        <mesh rotation={[quarter, 0, 0]}>
          <cylinderGeometry args={[0.047, 0.054, 0.18, 12]} />
          <meshStandardMaterial color="#777e72" metalness={0.57} />
        </mesh>
      </group>
    </group>
  );
}

function CatwalkStairs({ x }: { x: number }) {
  const topY = catwalk.y + catwalk.thickness / 2;
  const topZ = catwalk.z + 0.62;
  const startZ = topZ + 3.28;
  const steps = 15;
  const tread = (startZ - topZ) / steps;
  const rise = (topY - factoryFloor) / steps;
  return (
    <group position={[x, 0, 0]}>
      {Array.from({ length: steps }, (_, index) => factoryFloor + (index + 1) * rise).map((y, index) => (
        <group key={y} position={[0, y, startZ - (index + 0.5) * tread]}>
          <Block size={[1.24, 0.074, tread + 0.026]} color="#586263" />
          <Block size={[1.24, 0.028, 0.042]} color="#879084" position={[0, 0.034, tread / 2 - 0.01]} />
        </group>
      ))}
      {[-0.65, 0.65].map(side => (
        <group key={side} position={[side, 0, 0]}>
          <Brace start={[0, factoryFloor + 0.07, startZ]} end={[0, topY - 0.07, topZ]} width={0.143} />
          <Brace start={[0, factoryFloor + 0.88, startZ]} end={[0, topY + 0.91, topZ]} width={0.055} color={railing} />
          {[0.04, 0.48, 0.96].map(t => (
            <Block key={t} size={[0.054, 0.92, 0.055]} color={railing} position={[0, factoryFloor + 0.45 + (topY - factoryFloor) * t, startZ - 3.28 * t]} />
          ))}
        </group>
      ))}
    </group>
  );
}

function CatwalkLadder({ x }: { x: number }) {
  const bottom = factoryFloor + 0.13;
  const top = catwalk.y + 0.86;
  const cageBottom = -2.32;
  const cageTop = 0.38;
  return (
    <group position={[x, 0, catwalk.z + 0.78]}>
      {[-0.274, 0.274].map(side => (
        <Block key={side} size={[0.062, top - bottom, 0.079]} color={railing} position={[side, (top + bottom) / 2, 0]} />
      ))}
      {Array.from({ length: 11 }, (_, index) => bottom + 0.13 + index * 0.282).map(y => (
        <Block key={y} size={[0.51, 0.036, 0.071]} color="#85877a" position={[0, y, 0]} />
      ))}
      {[cageBottom, -1.42, -0.52, cageTop].map(y => (
        <mesh key={y} position={[0, y, 0.29]} rotation={[quarter, 0, 0]}>
          <torusGeometry args={[0.411, 0.023, 6, 20]} />
          <meshStandardMaterial color="#787e70" roughness={0.73} metalness={0.32} />
        </mesh>
      ))}
      {[-Math.PI / 3, 0, Math.PI / 3].map(angle => (
        <Block key={angle} size={[0.039, cageTop - cageBottom, 0.038]} color="#70786c"
          position={[Math.sin(angle) * 0.411, (cageTop + cageBottom) / 2, 0.29 + Math.cos(angle) * 0.411]} />
      ))}
    </group>
  );
}

function ServiceCatwalk() {
  const stairsX = -11.6;
  const ladderX = 13.1;
  const edge = catwalk.width / 2;
  const railRuns = [
    { start: -edge, end: stairsX - 0.67 },
    { start: stairsX + 0.67, end: ladderX - 0.37 },
    { start: ladderX + 0.37, end: edge },
  ];
  return (
    <>
      <group position={[0, catwalk.y, catwalk.z]}>
        <Block size={[catwalk.width, catwalk.thickness, catwalk.depth]} color="#4c575b" metalness={0.46} />
        <Block size={[catwalk.width, 0.048, 0.099]} color="#777973" position={[0, 0.119, 0.611]} metalness={0.49} />
        {railRuns.map(({ start, end }) => {
          const width = end - start;
          const bays = Math.ceil(width / 2.2);
          return (
            <group key={start} position={[start, 0, 0.606]}>
              {[0.49, 0.92].map(y => (
                <mesh key={y} position={[width / 2, y, 0]} rotation={[0, 0, quarter]}>
                  <cylinderGeometry args={[0.042, 0.042, width, 10]} />
                  <meshStandardMaterial color={railing} roughness={0.65} metalness={0.35} />
                </mesh>
              ))}
              {Array.from({ length: bays + 1 }, (_, index) => width * index / bays).map(x => (
                <Block key={x} size={[0.057, 0.907, 0.062]} color={railing} position={[x, 0.51, 0]} />
              ))}
            </group>
          );
        })}
        {[-12.4, -6.28, 0, 6.28, 12.4].map(x => (
          <group key={x} position={[x, 0, -0.37]}>
            <Block size={[0.23, 3.05, 0.23]} color={girder} position={[0, -1.52, 0]} />
            <Brace start={[0, -1.54, 0]} end={[x > 0 ? -2.15 : 2.15, -0.18, 0]} width={0.116} />
          </group>
        ))}
      </group>
      <CatwalkStairs x={stairsX} />
      <CatwalkLadder x={ladderX} />
    </>
  );
}

function ConveyorBracing() {
  const z = conveyor.z + conveyor.width / 2 + 0.09;
  const bays = conveyorSupports.slice(1, -2).filter((_, index) => index % 2 === 0);
  return (
    <group>
      {bays.map(x => (
        <Brace key={x} start={[x, factoryFloor + 0.21, z]} end={[x + conveyor.baySpacing, conveyor.y - 0.19, z]} width={0.089} color="#636d69" />
      ))}
      {[-6.45, 7.14].map(x => (
        <group key={x} position={[x, conveyor.y - 0.028, z + 0.113]}>
          <Block size={[0.54, 0.176, 0.036]} color="#5a5141" />
          {[-0.186, -0.092, 0, 0.092, 0.186].map(offset => (
            <Block key={offset} size={[0.046, 0.157, 0.013]} color="#b99a58" position={[offset, 0, 0.021]} rotation={[0, 0, -0.47]} />
          ))}
        </group>
      ))}
    </group>
  );
}

export function FactoryStructure() {
  return (
    <>
      <Block size={[43.2, 8.23, 0.46]} color="#51595c" position={[0, 0.395, -27.85]} />
      <Block size={[43.2, 0.31, 23.88]} color="#303a3e" position={[0, factoryCeiling, -15.6]} />
      {Array.from({ length: 20 }, (_, index) => (index - 9.5) * 2.04).map((x, index) => (
        <group key={x} position={[x, 0.36, -27.55]}>
          <Block size={[1.97, 7.73, 0.16]} color={index % 4 === 0 ? "#475256" : "#566165"} />
          <Block size={[0.128, 7.73, 0.27]} color="#65706f" position={[-0.969, 0, 0.08]} />
        </group>
      ))}
      {[-21.6, 21.6].map(x => <Block key={x} size={[0.38, 7.99, 26]} color="#4d585a" position={[x, 0.42, -14.4]} />)}
      {[-7.06, -15.92, -23.4].map(z => (
        <group key={z}>
          <Block size={[43.1, 0.334, 0.269]} color={girder} position={[0, factoryCeiling - 0.307, z]} />
          <Block size={[43.1, 0.054, 0.41]} color="#687274" position={[0, factoryCeiling - 0.45, z]} metalness={0.36} />
          {[-17.07, -10.61, 10.61, 17.07].map(x => (
            <group key={x} position={[x, 0, z]}>
              <Block size={[0.31, 7.54, 0.365]} color={girder} position={[0, 0.23, 0]} />
              <Block size={[0.062, 7.47, 0.424]} color="#6a7373" position={[-0.174, 0.23, 0]} />
              <Block size={[0.072, 7.47, 0.422]} color="#606969" position={[0.174, 0.23, 0]} />
              <Block size={[0.57, 0.096, 0.68]} color="#525e61" position={[0, factoryFloor + 0.049, 0]} />
              <Block size={[0.45, 0.52, 0.076]} color="#6e7975" position={[0, 1.46, 0.194]} />
              <Brace start={[0, 1.48, 0]} end={[-Math.sign(x) * 2.8, 3.87, 0]} width={0.145} />
            </group>
          ))}
        </group>
      ))}
      {serviceLanes.map(lane => (
        <group key={lane.x}>
          <PipeRack {...lane} />
          <ServiceRiser {...lane} />
        </group>
      ))}
      <ServiceCatwalk />
      <ConveyorBracing />
    </>
  );
}
