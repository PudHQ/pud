import { Vector3, type Camera } from "three";
import { display, drive, powerSwitch, type ScreenControls } from "./office/desk-layout";

type Viewport = { width: number; height: number };
type Point = { x: number; y: number };

export function makeScreenProjection() {
  const [x, y, z] = display.position;
  const halfWidth = display.width / 2;
  const halfHeight = display.height / 2;
  const glass = [
    new Vector3(x - halfWidth, y + halfHeight, z),
    new Vector3(x + halfWidth, y + halfHeight, z),
    new Vector3(x + halfWidth, y - halfHeight, z),
    new Vector3(x - halfWidth, y - halfHeight, z),
  ];
  const buttons = [["eject", drive], ["powerSwitch", powerSwitch]] as const;
  const buttonEdges = buttons.map(([ref, { position: [x, y, z], width }]) => ({
    ref, left: new Vector3(x - width / 2, y, z), right: new Vector3(x + width / 2, y, z),
  }));
  const projected = new Vector3();
  let raster: { screen: HTMLDivElement; viewport: Viewport; width: number; height: number } | undefined;

  function project(point: Vector3, camera: Camera, { width, height }: Viewport): Point {
    projected.copy(point).project(camera);
    return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
  }

  return (camera: Camera, viewport: Viewport, controls: ScreenControls) => {
    const screen = controls.screen.current;
    if (screen) {
      const [a, b, c, d] = glass.map(corner => project(corner, camera, viewport));
      // Update the layout only on resize. Camera motion changes the transform without resizing the live iframe.
      if (raster?.screen !== screen || raster.viewport.width !== viewport.width || raster.viewport.height !== viewport.height || !screen.style.width) {
        const projectedWidth = (b.x - a.x + c.x - d.x) / 2;
        const width = Math.max(320, Math.round(projectedWidth / 8) * 8);
        const height = Math.round(width * display.height / display.width);
        raster = { screen, viewport, width, height };
        screen.style.left = "0px";
        screen.style.top = "0px";
        screen.style.width = `${width}px`;
        screen.style.height = `${height}px`;
      }
      const { width, height } = raster;
      const transform = projectRectangle(a, b, c, d, width, height);
      if (transform) screen.style.transform = transform;
    }

    for (const edges of buttonEdges) {
      const button = controls[edges.ref].current;
      if (!button) continue;
      const left = project(edges.left, camera, viewport);
      const right = project(edges.right, camera, viewport);
      button.style.left = `${(left.x + right.x) / 2}px`;
      button.style.top = `${(left.y + right.y) / 2}px`;
      button.style.width = `${Math.max(44, right.x - left.x)}px`;
    }
  };
}

// Convert a perspective-projected quadrilateral to a CSS transform around its top-left corner.
function projectRectangle(a: Point, b: Point, c: Point, d: Point, width: number, height: number) {
  const ax = b.x - c.x;
  const ay = b.y - c.y;
  const bx = d.x - c.x;
  const by = d.y - c.y;
  const sx = a.x - b.x + c.x - d.x;
  const sy = a.y - b.y + c.y - d.y;
  const denominator = ax * by - bx * ay;
  if (Math.abs(denominator) < 0.00001) return null;
  const g = (sx * by - bx * sy) / denominator;
  const h = (ax * sy - sx * ay) / denominator;
  return `matrix3d(${[
    (b.x - a.x + g * b.x) / width, (b.y - a.y + g * b.y) / width, 0, g / width,
    (d.x - a.x + h * d.x) / height, (d.y - a.y + h * d.y) / height, 0, h / height,
    0, 0, 1, 0, a.x, a.y, 0, 1,
  ].join(",")})`;
}
