import { useEffect, useMemo } from "react";
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3, type Vector3Tuple } from "three";
import { Block } from "@/components/scenes/props";
import { desktopCase, keyboard, lamp, mouse } from "./desk-layout";

const quarterTurn = Math.PI / 2;
const rear = desktopCase.front - desktopCase.depth - 0.061;
const wires: { color: string; radius: number; points: Vector3Tuple[] }[] = [
  {
    color: "#51473b", radius: 0.018,
    points: [
      [lamp.position[0] - 0.040, 0.048, lamp.position[2] - 0.235], [-2.033, 0.031, 1.063], [-2.102, 0.021, 0.947],
      [-2.161, 0.021, 0.775], [-2.138, 0.021, 0.558], [-2.095, 0.025, 0.398], [-2.119, 0.06, 0.298],
      [-2.143, 0.105, 0.265], [-2.145, 0.137, 0.222],
    ],
  },
  {
    color: "#817965", radius: 0.014,
    points: [
      [-0.58, 0.084, keyboard.position[2] - 0.332], [-0.65, 0.054, 1.302], [-0.909, 0.022, 1.296], [-1.205, 0.021, 1.335],
      [-1.365, 0.019, 1.21], [-1.37, 0.018, 0.781], [-1.26, 0.018, -0.571], [-1.194, 0.026, -1.17], [-0.84, 0.037, -1.282],
      [-0.493, 0.16, -1.273], [-0.4, 0.367, -1.175], [-0.4, 0.367, rear],
    ],
  },
  {
    color: "#a49479", radius: 0.0135,
    points: [
      [mouse.position[0] + 0.034, 0.038, mouse.position[2] - 0.277], [1.258, 0.026, 1.396], [1.337, 0.018, 1.347],
      [1.306, 0.0175, 1.28], [1.244, 0.0175, 1.222], [1.221, 0.0175, 1.106], [1.231, 0.018, 0.75], [1.243, 0.018, 0.32],
      [1.245, 0.027, -0.957], [0.994, 0.033, -1.284], [0.25, 0.075, -1.293], [-0.23, 0.323, -1.227], [-0.23, 0.367, rear],
    ],
  },
];

function Cable({ color, radius, points }: (typeof wires)[number]) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(point => new Vector3(...point))), [points]);
  return (
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 54, radius, 7, false]} />
      <meshStandardMaterial color={color} roughness={0.47} />
    </mesh>
  );
}

function mouseShell([left, right]: [number, number], [front, back]: [number, number], offset: number, underside = false) {
  const stepsX = 24;
  const stepsZ = 34;
  const vertices: number[] = [];
  const indexes: number[] = [];
  for (let row = 0; row <= stepsZ; row++) {
    const v = front + (back - front) * row / stepsZ;
    const taper = (1 - v ** 4) ** 0.44;
    for (let column = 0; column <= stepsX; column++) {
      const u = left + (right - left) * column / stepsX;
      const crown = Math.cos(u * Math.PI / 2) ** 0.52 * taper;
      const palm = underside ? -0.031 : 0.119 * (0.77 + v * 0.24);
      const x = u * mouse.width / 2 * taper * (0.985 + v * 0.069);
      const y = 0.033 + crown * palm + offset;
      vertices.push(x, y, mouse.depth / 2 * v);

      if (column === stepsX || row === stepsZ) continue;
      const a = row * (stepsX + 1) + column;
      const c = a + stepsX + 1;
      if (underside) indexes.push(a, a + 1, c, a + 1, c + 1, c);
      else indexes.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indexes);
  geometry.computeVertexNormals();
  return geometry;
}

function BallMouse() {
  const shells = useMemo(() => ({
    lower: mouseShell([-1, 1], [-1, 1], 0, true),
    housing: mouseShell([-1, 1], [-1, 1], -0.001),
    palm: mouseShell([-1, 1], [-0.302, 1], 0.003),
    left: mouseShell([-1, -0.019], [-1, -0.324], 0.003),
    right: mouseShell([0.019, 1], [-1, -0.324], 0.003),
  }), []);
  useEffect(() => () => {
    for (const shell of Object.values(shells)) shell.dispose();
  }, [shells]);

  return (
    <group position={mouse.position} rotation={[0, mouse.angle, 0]}>
      <mesh geometry={shells.lower} castShadow receiveShadow>
        <meshStandardMaterial color="#948975" roughness={0.69} />
      </mesh>
      <mesh geometry={shells.housing} castShadow receiveShadow>
        <meshStandardMaterial color="#655e50" roughness={0.72} />
      </mesh>
      <mesh geometry={shells.palm} castShadow receiveShadow>
        <meshPhysicalMaterial color="#c9bdab" roughness={0.53} clearcoat={0.2} clearcoatRoughness={0.62} />
      </mesh>
      {[shells.left, shells.right].map((shell, index) => (
        <mesh key={index} geometry={shell} castShadow receiveShadow>
          <meshPhysicalMaterial color="#cfc3b2" roughness={0.52} clearcoat={0.17} />
        </mesh>
      ))}
      <mesh position={[0, 0.036, -0.27]} rotation={[quarterTurn, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.023, 0.038, 14]} />
        <meshStandardMaterial color="#867864" roughness={0.73} />
      </mesh>
    </group>
  );
}

export function DeskPeripherals() {
  return (
    <group>
      <BallMouse />
      <Block size={[0.49, 0.083, 0.202]} radius={0.019} color="#7e7970" position={[-2.10, 0.049, 0.15]} castShadow />
      {[-2.219, -2.08, -1.94].map(x => <Block key={x} size={[0.071, 0.013, 0.105]} radius={0.005} color="#474540" position={[x, 0.092, 0.142]} />)}
      <Block size={[0.086, 0.065, 0.095]} radius={0.012} color="#383732" position={[-2.146, 0.124, 0.202]} castShadow />
      {wires.map(wire => <Cable key={wire.color} {...wire} />)}
      {([[-0.4, "#756983"], [-0.23, "#687c68"]] as const).map(([x, color]) => (
        <mesh key={x} position={[x, 0.367, rear - 0.022]} rotation={[quarterTurn, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.037, 0.051, 12]} />
          <meshStandardMaterial color={color} roughness={0.59} />
        </mesh>
      ))}
    </group>
  );
}
