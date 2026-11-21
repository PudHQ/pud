import { between, clamp, cross, variants } from "./wallpaper-paint";
import type { Area, Point, Reaction, WallpaperTap } from "./wallpaper-paint";

interface Chip extends Point { width: number; height: number }
interface Trace { chip: number; copper?: boolean; nodes: ReadonlyArray<readonly [number, number]> }

// Coordinates match the repeating circuit wallpaper, including its vias and package pins.
export const circuitBoard = {
  width: 212,
  height: 160,
  chips: [
    { x: 32, y: 11, width: 16, height: 10 },
    { x: 105, y: 77, width: 20, height: 18 },
    { x: 169, y: 131, width: 18, height: 14 },
    { x: 6, y: 111, width: 8, height: 12 },
  ] satisfies Chip[],
  traces: [
    { chip: 0, nodes: [[4, 36], [11, 36], [22, 25], [22, 13], [24, 13]] },
    { chip: 0, copper: true, nodes: [[70, 7], [63, 7], [60, 10], [40, 10]] },
    { chip: 0, nodes: [[75, 37], [61, 37], [52, 28], [43, 28], [35, 20], [35, 16]] },
    { chip: 0, nodes: [[11, 5], [19, 5], [23, 9], [25, 9]] },
    { chip: 1, nodes: [[47, 56], [64, 56], [80, 72], [95, 72]] },
    { chip: 1, copper: true, nodes: [[43, 94], [62, 94], [76, 80], [95, 80]] },
    { chip: 1, nodes: [[117, 35], [117, 44], [110, 51], [110, 68]] },
    { chip: 1, nodes: [[151, 69], [137, 69], [133, 73], [115, 73]] },
    { chip: 1, copper: true, nodes: [[156, 94], [141, 94], [130, 83], [115, 83]] },
    { chip: 1, nodes: [[77, 143], [77, 122], [102, 97], [102, 86]] },
    { chip: 2, nodes: [[117, 115], [142, 115], [153, 126], [160, 126]] },
    { chip: 2, copper: true, nodes: [[127, 150], [145, 150], [158, 137], [160, 137]] },
    { chip: 2, nodes: [[196, 81], [196, 111], [180, 127], [178, 127]] },
    { chip: 2, nodes: [[201, 145], [191, 145], [180, 134], [178, 134]] },
    { chip: 3, nodes: [[6, 59], [6, 75], [3, 78], [3, 97], [6, 100], [6, 105]] },
    { chip: 3, copper: true, nodes: [[6, 152], [6, 136], [4, 134], [4, 122], [7, 119], [7, 117]] },
    { chip: 3, nodes: [[29, 122], [24, 122], [16, 114], [10, 114]] },
  ] satisfies Trace[],
};

function inside(point: Point, area: Area) {
  return point.x >= area.left && point.x < area.right && point.y >= area.top && point.y < area.bottom;
}

function routeToChip({ point, viewport, wiki }: WallpaperTap) {
  let best: { chip: Chip; copper: boolean; path: Point[]; cost: number } | undefined;
  const board = circuitBoard;
  for (let y = 0; y < viewport.bottom; y += board.height) {
    for (let x = 0; x < viewport.right; x += board.width) {
      for (const trace of board.traces) {
        const part = board.chips[trace.chip];
        const chip = { ...part, x: x + part.x, y: y + part.y };
        if (!inside(chip, viewport)) continue;
        const hidden = inside(chip, wiki);
        if (hidden && best && best.cost < 10000) continue;
        const extent = Math.hypot(point.x - chip.x, point.y - chip.y);
        const nodes = trace.nodes.map(([dx, dy]) => ({ x: x + dx, y: y + dy }));
        for (let index = 0; index < nodes.length - 1; index++) {
          const from = nodes[index], to = nodes[index + 1];
          const dx = to.x - from.x, dy = to.y - from.y;
          const nearest = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / (dx * dx + dy * dy));
          const contact = { x: Math.round(from.x + nearest * dx), y: Math.round(from.y + nearest * dy) };
          const cost = Math.hypot(point.x - contact.x, point.y - contact.y) + extent * 0.18 +
            (inside(contact, wiki) ? 28 : 0) + (hidden ? 10000 : 0);
          if (best && cost >= best.cost) continue;
          const join = { x: point.x, y: contact.y };
          best = { chip, copper: !!trace.copper, cost, path: [point, join, contact, ...nodes.slice(index + 1)] };
        }
      }
    }
  }
  return best ?? {
    chip: { x: point.x, y: point.y, width: 8, height: 8 }, copper: false,
    path: [point, { x: point.x + 1, y: point.y }],
  };
}

const chargeLevels = variants<readonly [number, number]>([[0.34, 0.46], [0.51, 0.65], [0.72, 0.83], [0.9, 1]]);

export function circuitCharge(tap: WallpaperTap): Reaction {
  const { chip, path, copper } = routeToChip(tap);
  const intensity = between(...chargeLevels());
  const signal = copper ? "#ffbc70" : "#8ee6b1";
  const nodes = [{ ...path[0], distance: 0 }];
  for (const next of path.slice(1)) {
    const last = nodes[nodes.length - 1];
    const distance = Math.hypot(next.x - last.x, next.y - last.y);
    if (distance > 0) nodes.push({ ...next, distance: last.distance + distance });
  }
  const length = nodes[nodes.length - 1].distance;

  function at(distance: number) {
    const next = nodes.findIndex(node => node.distance > distance);
    if (next < 1) return nodes[nodes.length - 1];
    const left = nodes[next - 1], right = nodes[next];
    const fraction = (distance - left.distance) / (right.distance - left.distance);
    return { x: left.x + (right.x - left.x) * fraction, y: left.y + (right.y - left.y) * fraction };
  }

  function trace(context: CanvasRenderingContext2D, start: number, end: number, opacity: number) {
    const from = at(start), to = at(end);
    context.beginPath();
    context.moveTo(Math.round(from.x) + 0.5, Math.round(from.y) + 0.5);
    for (const node of nodes) {
      if (node.distance > start && node.distance < end) context.lineTo(node.x + 0.5, node.y + 0.5);
    }
    context.lineTo(Math.round(to.x) + 0.5, Math.round(to.y) + 0.5);
    context.strokeStyle = signal;
    context.lineWidth = 2 + Math.round(intensity * 3);
    context.globalAlpha = opacity * 0.2;
    context.stroke();
    context.lineWidth = 1;
    context.globalAlpha = opacity;
    context.stroke();
  }

  function lightChip(context: CanvasRenderingContext2D, opacity: number) {
    const left = chip.x - chip.width / 2, top = chip.y - chip.height / 2;
    context.fillStyle = signal;
    context.globalAlpha = opacity * 0.19;
    context.fillRect(left - 2, top - 2, chip.width + 4, chip.height + 4);
    context.strokeStyle = signal;
    context.lineWidth = 1;
    context.globalAlpha = opacity;
    context.strokeRect(left + 0.5, top + 0.5, chip.width - 1, chip.height - 1);
    context.fillStyle = "#f7ffd8";
    cross(context, left + 3, top + 3, 1 + Math.floor(intensity));
  }

  return {
    duration: Math.min(1550, 870 + length * 1.25) + between(30, 120),
    draw(context, progress) {
      const travel = clamp(progress / 0.69);
      const head = length * travel;
      context.save();
      if (travel < 1) {
        trace(context, Math.max(0, head - 10 - intensity * 25), head, intensity);
        const front = at(head);
        context.fillStyle = "#f6ffe0";
        cross(context, front.x, front.y, intensity > 0.68 ? 2 : 1);
        if (progress < 0.18) {
          context.globalAlpha = intensity * (1 - progress / 0.18);
          context.fillStyle = signal;
          cross(context, tap.point.x, tap.point.y, Math.round(2 + intensity * 2));
        }
      } else {
        const glow = clamp((1 - progress) / 0.31) * intensity;
        trace(context, Math.max(0, length - 19), length, glow * 0.72);
        lightChip(context, glow);
      }
      context.restore();
    },
    still(context) {
      context.save();
      trace(context, 0, length, intensity * 0.63);
      lightChip(context, intensity);
      context.restore();
    },
  };
}
