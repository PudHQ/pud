export type SumStage = "stack" | "pair" | "rectangle";
export const stageNumber = { stack: 0, pair: 1, rectangle: 2 } as const;

type Point = { x: number; y: number };
type Tile = { face: Point[]; orange: boolean; missing: boolean; opacity: number; depth: number };

const blue = { face: "#3636cf", side: "#20206f", edge: "#16174f" };
const orange = { face: "#ec6429", side: "#a73c18", edge: "#66280e" };
const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const ease = (t: number) => t * t * (3 - 2 * t);

function polygon(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function ruler(ctx: CanvasRenderingContext2D, from: Point, to: Point, count: number, offset: Point, font: number) {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  ctx.strokeStyle = "#47433d";
  ctx.fillStyle = "#272521";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  for (let i = 0; i <= count; i++) {
    const tick = i === 0 || i === count ? 1 : 0.4;
    const x = from.x + (i * dx) / count;
    const y = from.y + (i * dy) / count;
    ctx.moveTo(x - offset.x * tick * 0.42, y - offset.y * tick * 0.42);
    ctx.lineTo(x + offset.x * tick * 0.42, y + offset.y * tick * 0.42);
  }
  ctx.stroke();
  ctx.font = `600 ${font}px ui-monospace, "SFMono-Regular", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(count), from.x + dx / 2 + offset.x * 1.6, from.y + dy / 2 + offset.y * 1.6);
}

/** A point at (column,row) is a corner of a unit cell. Rotating by π maps
 * (column,row) cells to (n−column,n−1−row), the other half of the rectangle. */
export function drawSum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  n: number,
  broken: boolean,
  progress: number,
  removal = Number(broken),
) {
  ctx.clearRect(0, 0, width, height);
  if (n === 0 || width < 1 || height < 1) return;
  const turn = ease(clamp(progress));
  const dock = ease(clamp(progress - 1));
  const angle = -Math.PI * turn;
  const dx = (n + 1) * 0.23 * turn * (1 - dock);
  const dy = n * 0.24 * turn * (1 - dock);
  const small = clamp((width / height - 1.18) / 0.75);
  const camera = ease(clamp((dock - 0.08) / 0.92));
  const oblique = -0.18 - 0.2 * small;
  const shear = oblique * (1 - camera) - 0.034 * camera;
  const tiltedRise = 0.91 - 0.26 * small;
  const rise = tiltedRise * (1 - camera) + 0.979 * camera;
  const relief = Math.min(0.17, n * 0.043);
  const thickness = { x: relief * 0.58, y: relief * 0.87 };
  const project = (x: number, y: number): Point => ({ x: x + shear * y, y: -0.035 * (1 - camera) * x + rise * y });
  const lift = 0.12 * n * Math.sin(Math.PI * turn);
  function position(x: number, y: number, copy: boolean) {
    if (!copy) return project(x, y);
    const ax = x - (n + 1) / 2,
      ay = y - n / 2;
    const point = project(
      ax * Math.cos(angle) - ay * Math.sin(angle) + (n + 1) / 2 + dx,
      ax * Math.sin(angle) + ay * Math.cos(angle) + n / 2 + dy,
    );
    point.y -= lift;
    return point;
  }

  const tiles: Tile[] = [];
  for (const copy of [false, true]) {
    const opacity = copy ? ease(clamp(turn * 6)) : 1;
    if (opacity === 0) continue;
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n - row; col++) {
        const face = [
          position(col, row, copy),
          position(col + 1, row, copy),
          position(col + 1, row + 1, copy),
          position(col, row + 1, copy),
        ];
        tiles.push({
          face,
          orange: copy,
          opacity,
          missing: removal > 0 && row === n - 1,
          depth: face.reduce((sum, p) => sum + p.y, 0) / 4,
        });
      }
    }
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const tile of tiles) {
    for (const point of tile.face) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x + thickness.x);
      maxY = Math.max(maxY, point.y + thickness.y);
    }
  }
  // Reserve annotation room throughout so drawing the final rulers cannot shift the proof.
  const font = clamp(width * 0.027, 12, 20);
  const offset = clamp(width * 0.017, 6, 13);
  const marginX = Math.max(20, width * 0.053);
  const marginBottom = Math.max(14, height * 0.056);
  const marginTop = Math.max(17, height * 0.06, offset * 2.1 + font * 0.65 + 2);
  const factor = Math.min(
    (width - marginX * 2) / (maxX - minX),
    (height - marginTop - marginBottom) / (maxY - minY),
  );
  const left = (width - (maxX + minX) * factor) / 2;
  const top = (height + marginTop - marginBottom - (maxY + minY) * factor) / 2;
  const map = (p: Point): Point => ({ x: left + factor * p.x, y: top + factor * p.y });
  const wall = { x: factor * thickness.x, y: factor * thickness.y };
  const step = Math.max(0.8, Math.min(factor * 0.035, 1.8));

  ctx.save();
  ctx.lineJoin = "round";
  // During the turn the lifted orange sheet passes entirely above the blue sheet.
  tiles.sort((a, b) => (turn < 1 ? Number(a.orange) - Number(b.orange) : 0) || a.depth - b.depth);
  for (const tile of tiles) tile.face = tile.face.map(map);

  // Lay the complete relief under the inked faces. A neighbor hides the wall
  // between two occupied cells, so the finished object has one continuous face.
  function rim(tile: Tile) {
    if (tile.missing) return;
    const face = tile.face;
    const palette = tile.orange ? orange : blue;
    ctx.globalAlpha = tile.opacity;
    // Only the two faces turned toward the viewer can be seen.
    for (let i = 0; i < face.length; i++) {
      const a = face[i],
        b = face[(i + 1) % 4];
      if ((b.y - a.y) * wall.x - (b.x - a.x) * wall.y <= 0) continue;
      polygon(ctx, [a, b, { x: b.x + wall.x, y: b.y + wall.y }, { x: a.x + wall.x, y: a.y + wall.y }]);
      ctx.fillStyle = palette.side;
      ctx.fill();
      ctx.strokeStyle = palette.edge;
      ctx.lineWidth = step * 0.7;
      ctx.stroke();
    }
  }
  function ink(tile: Tile) {
    const face = tile.face;
    const palette = tile.orange ? orange : blue;
    ctx.globalAlpha = tile.opacity;
    if (tile.missing) {
      polygon(ctx, face);
      ctx.fillStyle = "#f7f0de";
      ctx.fill();
      ctx.lineWidth = Math.max(1.3, step * 1.25);
      ctx.setLineDash([step * 2.8, step * 2]);
      ctx.strokeStyle = palette.edge;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      for (const [a, b] of [
        [0, 2],
        [1, 3],
      ]) {
        const start = face[a],
          end = face[b];
        ctx.moveTo(start.x * 0.72 + end.x * 0.28, start.y * 0.72 + end.y * 0.28);
        ctx.lineTo(start.x * 0.28 + end.x * 0.72, start.y * 0.28 + end.y * 0.72);
      }
      ctx.stroke();
      return;
    }
    polygon(ctx, face);
    ctx.fillStyle = palette.face;
    ctx.fill();
    ctx.lineWidth = step;
    ctx.strokeStyle = palette.edge;
    ctx.stroke();
  }
  for (const tile of tiles) rim(tile);
  for (const tile of tiles) ink(tile);

  // Extract the exact one-unit row from each copy. The holes stay registered to
  // the board while the two solid units move independently above it.
  if (removal > 0 && removal < 1) {
    const exit = ease(removal);
    for (const slot of tiles) {
      if (!slot.missing) continue;
      const sign = slot.orange ? 1 : -1;
      const center = { x: 0, y: 0 };
      for (const p of slot.face) {
        center.x += p.x / 4;
        center.y += p.y / 4;
      }
      const angle = sign * 0.15 * exit;
      const liftX = sign * exit * Math.min(factor * 1.1, 43);
      const liftY = -Math.sin((exit * Math.PI) / 2) * Math.min(factor * 0.78, marginTop * 0.78);
      const face = slot.face.map((p) => {
        const x = p.x - center.x,
          y = p.y - center.y;
        return {
          x: center.x + liftX + x * Math.cos(angle) - y * Math.sin(angle),
          y: center.y + liftY + x * Math.sin(angle) + y * Math.cos(angle),
        };
      });
      const tile = {
        ...slot,
        face,
        missing: false,
        opacity: slot.opacity * (1 - ease(clamp((removal - 0.49) / 0.51))),
      };
      rim(tile);
      ink(tile);
    }
  }
  ctx.globalAlpha = 1;
  if (progress < 0.21) {
    ctx.globalAlpha = 1 - ease(clamp(progress / 0.21));
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.font = `550 ${font}px ui-monospace, "SFMono-Regular", monospace`;
    ctx.fillStyle = "#454139";
    for (let row = 0; row < n; row++) {
      const edge = map(project(0, row + 0.5));
      ctx.fillText(String(n - row), edge.x - offset, edge.y);
    }
  } else if (progress > 1.74) {
    ctx.globalAlpha = ease(clamp((progress - 1.74) / 0.26));
    const far = map(project(n + 1, 0));
    const near = map(project(0, 0));
    const low = map(project(0, n));
    ruler(
      ctx,
      { x: near.x, y: near.y - offset },
      { x: far.x, y: far.y - offset },
      n + 1,
      { x: 0, y: -offset * 0.67 },
      font,
    );
    ruler(
      ctx,
      { x: near.x - offset, y: near.y },
      { x: low.x - offset, y: low.y },
      n,
      { x: -offset * 0.67, y: 0 },
      font,
    );
  }
  ctx.restore();
}
