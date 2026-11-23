import { Instance, Instances } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { BufferGeometry, ExtrudeGeometry, Float32BufferAttribute, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Block, usePrint } from "../scenes/props";
import { keyboard } from "./desk-layout";

type Key = { label: string; x: number; z: number; width: number; gray: boolean };
type Legend = string | readonly [string, number];
const unit = 0.076;
const capDepth = 0.074;
const tile = 48;
const atlasColumns = 16;
const atlasRows = 8;

function makeKeys() {
  const keys: Key[] = [];
  function row(labels: readonly Legend[], left: number, z: number, gray = false) {
    let x = left;
    for (const label of labels) {
      const [name, units] = typeof label === "string" ? [label, 1] : label;
      const width = units * unit;
      if (name !== "gap") keys.push({ label: name, x: x + width / 2, z, width: width - 0.008, gray: gray || units > 1 });
      x += width;
    }
  }
  const left = -0.87;
  row(["Esc", ["gap", 0.6], "F1", "F2", "F3", "F4", ["gap", 0.32], "F5", "F6", "F7", "F8", ["gap", 0.32], "F9", "F10", "F11", "F12"], left, -0.244, true);
  row(["~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "–", "=", ["←", 2]], left, -0.139);
  row([["Tab", 1.5], ..."QWERTYUIOP", "[", "]", ["\\", 1.5]], left, -0.049);
  row([["Caps", 1.75], ..."ASDFGHJKL", ";", "'", ["Enter", 2.25]], left, 0.041);
  row([["Shift", 2.25], ..."ZXCVBNM", ",", ".", "/", ["Shift", 2.75]], left, 0.131);
  row([["Ctrl", 1.5], ["Alt", 1.4], ["", 6.8], ["Alt", 1.4], ["Ctrl", 1.5]], left, 0.221, true);

  const nav = 0.319;
  row(["Prt", "Scr", "Pse"], nav, -0.244, true);
  row(["Ins", "Hom", "Pg↑"], nav, -0.139, true);
  row(["Del", "End", "Pg↓"], nav, -0.049, true);
  row(["↑"], nav + unit, 0.131, true);
  row(["←", "↓", "→"], nav, 0.221, true);

  const pad = 0.58;
  row(["Num", "/", "×", "−"], pad, -0.139, true);
  row(["7", "8", "9", "+"], pad, -0.049);
  row(["4", "5", "6", "+"], pad, 0.041);
  row(["1", "2", "3", "↵"], pad, 0.131);
  row([["0", 2], ".", "↵"], pad, 0.221);
  return keys;
}

const keys = makeKeys();

function drawLegends(ink: CanvasRenderingContext2D) {
  ink.fillStyle = "#3e3930";
  ink.font = "700 22px monospace";
  ink.textAlign = "center";
  ink.textBaseline = "middle";
  keys.forEach(({ label }, index) => {
    ink.fillText(label, (index % atlasColumns + 0.5) * tile, (Math.floor(index / atlasColumns) + 0.56) * tile, tile - 7);
  });
}

function makeLegendGeometry() {
  const points: number[] = [];
  const uvs: number[] = [];
  const triangles: number[] = [];
  keys.forEach(({ x, z, width }, index) => {
    const dx = Math.min(width * 0.36, 0.043);
    const dz = 0.025;
    const top = 0.051;
    points.push(x - dx, top, z + dz, x + dx, top, z + dz, x + dx, top, z - dz, x - dx, top, z - dz);
    const u = index % atlasColumns / atlasColumns;
    const v = 1 - Math.floor(index / atlasColumns) / atlasRows;
    uvs.push(u, v - 1 / atlasRows, u + 1 / atlasColumns, v - 1 / atlasRows, u + 1 / atlasColumns, v, u, v);
    const offset = index * 4;
    triangles.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(points, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(triangles);
  return geometry;
}

function makeCase() {
  const side = new Shape();
  side.moveTo(-keyboard.depth / 2, 0.013);
  side.lineTo(keyboard.depth / 2, 0.013);
  side.lineTo(keyboard.depth / 2, 0.117);
  side.lineTo(-keyboard.depth / 2, 0.049);
  side.closePath();
  const geometry = new ExtrudeGeometry(side, { depth: keyboard.width, bevelThickness: 0.019, bevelSize: 0.014, bevelSegments: 3 });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-keyboard.width / 2, 0, 0);
  return geometry;
}

export function Keyboard() {
  const housing = useMemo(makeCase, []);
  const cap = useMemo(() => {
    const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
    const points = geometry.attributes.position;
    for (let index = 0; index < points.count; index++) {
      const scale = 1 - (points.getY(index) + 0.5) * 0.22;
      points.setX(index, points.getX(index) * scale);
      points.setZ(index, points.getZ(index) * scale);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  const legends = useMemo(makeLegendGeometry, []);
  const print = usePrint(atlasColumns * tile, atlasRows * tile, drawLegends);
  useEffect(() => () => { housing.dispose(); cap.dispose(); legends.dispose(); }, [housing, cap, legends]);

  return (
    <group position={keyboard.position} rotation={[0, 0.027, 0]}>
      <mesh geometry={housing} castShadow receiveShadow><meshStandardMaterial color="#c0ad8a" roughness={0.75} /></mesh>
      <mesh position={[-0.57, 0.084, -0.334]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.020, 0.048, 12]} />
        <meshStandardMaterial color="#8a806c" roughness={0.67} />
      </mesh>
      <group position={[0, 0.085, 0]} rotation={[0.106, 0, 0]}>
        <Block size={[1.77, 0.018, 0.559]} radius={0.007} color="#42392e" receiveShadow />
        <Instances geometry={cap} limit={keys.length} range={keys.length} castShadow receiveShadow>
          <meshStandardMaterial roughness={0.69} />
          {keys.map(({ x, z, width, gray }) => (
            <Instance key={`${x}/${z}`} color={gray ? "#a9997c" : "#d6c8a9"} position={[x, 0.028, z]} scale={[width, 0.044, capDepth]} />
          ))}
        </Instances>
        <mesh geometry={legends}>
          <meshBasicMaterial map={print} transparent opacity={0.75} depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      </group>
    </group>
  );
}
