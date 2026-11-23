import type { RefObject } from "react";
import type { Vector3Tuple } from "three";

// The PC 300GL type 6561 chassis is 450 mm square and 128 mm tall.
const caseWidth = 2.27;
export const desktopCase = { width: caseWidth, depth: caseWidth, height: caseWidth * (128 / 450), front: 1.225, foot: 0.022 };
export const face = desktopCase.front + 0.063;
export const deckHeight = desktopCase.height + desktopCase.foot;
export const monitorStand = { width: 1.05, depth: 0.82, height: 0.106, y: -0.922, z: -0.472 };
const tubeHeight = deckHeight - monitorStand.y + monitorStand.height / 2;
export const display = { width: 1.79, height: 1.29, position: [0, tubeHeight, 1.14] as Vector3Tuple };
export const drive = { width: 0.53, position: [0.357, 0.426, face] as Vector3Tuple };
export const powerSwitch = { width: 0.17, position: [0.914, 0.276, face + 0.014] as Vector3Tuple };
export const keyboard = { width: 1.83, depth: 0.64, position: [0, 0, 1.69] as Vector3Tuple };
export const lamp = {
  position: [-1.985, 0, 1.38] as Vector3Tuple,
  scale: 1.35,
  pivot: [0.269, 0.641, 0.058] as Vector3Tuple,
  aim: [1.016, 0.006, 0.274] as Vector3Tuple,
};
export const mouse = { position: [1.168, 0, 1.71] as Vector3Tuple, angle: -0.12, width: 0.36, depth: 0.53 };
export const mug = { position: [1.57, 0, 0.985] as Vector3Tuple, scale: 1.62 };
export const clipboard = { position: [1.918, 0.012, 1.775] as Vector3Tuple, scale: 1.34 };
export const desktopSurface = { width: 5.87, depth: 4.55, z: 0.98, y: 0.002 };

export type ScreenControls = {
  screen: RefObject<HTMLDivElement | null>;
  eject: RefObject<HTMLButtonElement | null>;
  powerSwitch: RefObject<HTMLButtonElement | null>;
};
