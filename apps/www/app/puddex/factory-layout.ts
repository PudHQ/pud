import type { Vector3Tuple } from "three";
import { officeFloor } from "./desk-layout";

export const factoryFloor = -3.54;
export const factoryCeiling = 4.30;
export const conveyor = { start: -20.16, end: 20.16, y: -1.49, z: -9.15, width: 1.38, baySpacing: 2.69 };
export const conveyorSupports = Array.from({ length: 15 }, (_, index) => (index - 7) * conveyor.baySpacing);
export const catwalk = { y: -0.45, z: -19.72, width: 29.1, depth: 1.29, thickness: 0.223 };
export const factoryGround = { position: [0, factoryFloor, -14.25], area: [43.4, 27.6] } satisfies { position: Vector3Tuple; area: [number, number] };
export const conveyorDeck = {
  position: [(conveyor.start + conveyor.end) / 2, conveyor.y + 0.143, conveyor.z],
  area: [conveyor.end - conveyor.start + 0.28, conveyor.width + 0.58],
} satisfies typeof factoryGround;

export const factoryLampColor = "#c4e0ff";
export const windowSpillColor = "#c0dcf7";
export const fixtures = [
  { position: [-5.62, 1.65, -10.20], power: 52, task: true },
  { position: [5.58, 1.69, -10.40], power: 52, task: true },
  { position: [-9.63, 2.24, -17.71], power: 36, task: false },
  { position: [8.69, 2.27, -18.10], power: 36, task: false },
] satisfies { position: Vector3Tuple; power: number; task: boolean }[];

export const windowWorkLights = [
  { position: [-4.76, 1.42, -6.16], target: [-3.70, officeFloor.y, -0.83], power: 40, angle: 0.46 },
  { position: [4.59, 1.31, -6.38], target: [3.63, officeFloor.y, -0.62], power: 42, angle: 0.47 },
] satisfies { position: Vector3Tuple; target: Vector3Tuple; power: number; angle: number }[];

export const serviceLanes = [
  { x: -8.57, z: -12.11, towardOven: 1 },
  { x: 8.68, z: -12.64, towardOven: -1 },
];
