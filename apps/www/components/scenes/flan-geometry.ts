import { Color, Float32BufferAttribute, LatheGeometry, Vector2 } from "three";

const flanProfile = [
  [0.006, 0],
  [0.156, 0],
  [0.176, 0.013],
  [0.184, 0.037],
  [0.177, 0.078],
  [0.151, 0.152],
  [0.144, 0.181],
  [0.129, 0.193],
  [0.006, 0.193],
].map(([r, y]) => new Vector2(r, y));
const caramelProfile = [
  [0.15, 0.159],
  [0.152, 0.172],
  [0.148, 0.181],
  [0.141, 0.192],
  [0.126, 0.2],
  [0, 0.201],
].map(([r, y]) => new Vector2(r, y));

export function moldFlan(segments = 36) {
  const geometry = new LatheGeometry(flanProfile, segments);
  const positions = geometry.attributes.position;
  const caramelGold = new Color("#e88819");
  const custard = new Color("#ffc654");
  const shade = new Color();
  const colors: number[] = [];
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const flute = 1 - (0.5 + 0.5 * Math.cos(Math.atan2(x, z) * 12)) * 0.062 * Math.sin((Math.PI * y) / 0.193);
    positions.setXYZ(index, x * flute, y, z * flute);
    shade.copy(caramelGold).lerp(custard, (y / 0.193) ** 0.59);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function pourCaramel(segments = 28) {
  const geometry = new LatheGeometry(caramelProfile, segments);
  const positions = geometry.attributes.position;
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const theta = Math.atan2(x, z);
    const spill = Math.max(0, (0.181 - y) / 0.022) * (0.5 + 0.5 * Math.cos(theta * 5 - 0.7)) ** 6;
    positions.setXYZ(index, x * (1 + spill * 0.106), y - spill * 0.032, z * (1 + spill * 0.106));
  }
  geometry.computeVertexNormals();
  return geometry;
}
