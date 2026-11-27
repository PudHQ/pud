import { bendRaster } from "@pud/crt";
import type { Path } from "three";

type Point = [number, number];

function makeContour() {
  const radiusX = 0.076;
  const radiusY = 0.105;
  const corners: Point[] = [[1 - radiusX, -1 + radiusY], [1 - radiusX, 1 - radiusY], [-1 + radiusX, 1 - radiusY], [-1 + radiusX, -1 + radiusY]];
  const contours = corners.map(([x, y], index) => Array.from({ length: 9 }, (_, step): Point => {
    const angle = (index - 1 + step / 8) * Math.PI / 2;
    return [x + Math.cos(angle) * radiusX, y + Math.sin(angle) * radiusY];
  }));
  return contours.flatMap((arc, index) => {
    const end = arc[arc.length - 1];
    const next = contours[(index + 1) % contours.length][0];
    const edge = Array.from({ length: 20 }, (_, step): Point => {
      const t = (step + 1) / 21;
      return [end[0] + (next[0] - end[0]) * t, end[1] + (next[1] - end[1]) * t];
    });
    return [...arc, ...edge].map(([x, y]) => bendRaster(x, y));
  });
}

export const glassContour = makeContour();
export const glassOutline = `M ${glassContour.map(point => point.map(axis => ((axis + 1) / 2).toFixed(5)).join(" ")).join(" L ")} Z`;

// The DOM aperture and each of the physical trim rings share this contour.
export function traceGlass<T extends Path>(shape: T, width: number, height: number): T {
  const [[x, y], ...rim] = glassContour;
  shape.moveTo(x * width / 2, -y * height / 2);
  for (const [u, v] of rim) shape.lineTo(u * width / 2, -v * height / 2);
  shape.closePath();
  return shape;
}
