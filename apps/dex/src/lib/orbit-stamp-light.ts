import type { Spark } from "./orbit-sparks";

export const bevels = [
  [47, 12, 8, -12], [17, 62, -7, 10], [83, 56, -10, 9], [113, 25, 4, -10],
  [130, 62, -6, 11], [160, 12, 10, -10], [201, 58, -4, 13], [228, 17, 9, -9],
  [259, 26, -8, -9], [284, 61, 10, 10], [322, 25, -10, -10], [348, 63, 7, 10],
] as const;

type Point = { x: number; y: number };
type Placement = Point & { scale: number };
type Mote = Point & {
  drift: number; rise: number; start: number; duration: number; size: number; warmth: number; pixel: boolean;
};

export function createStampLight(glint: SVGGElement, width: number, height: number) {
  let target: Point | undefined, reflection: Point | undefined;
  let opacity = 0, last = 0;
  let motes: Mote[] = [];
  const lit = new Set<number>();
  const caughtAt = bevels.map(() => -Infinity);

  function angle(point: Point) { return (point.y / height - .5) * 16; }

  function band(point: Point) {
    // Keep contact with the same diagonal as the SVG reflection as it shifts and tilts.
    const radians = (31 + angle(point)) * Math.PI / 180;
    const nx = Math.cos(radians), ny = Math.sin(radians);
    const centerY = height / 2 + (point.y - height / 2) * .6;
    return (x: number, y: number) => (x - point.x) * nx + (y - centerY) * ny - 2.5;
  }

  function catchLight(now: number, point: Point, previous?: Point) {
    const current = band(point), prior = previous && band(previous);
    for (const [index, [x, y, drift, rise]] of bevels.entries()) {
      const distance = current(x, y);
      const near = Math.abs(distance) < 17 && Math.abs(y - point.y) < height * .61;
      const crossed = prior && Math.abs(y - point.y) < height * .61 && prior(x, y) * distance < 0;
      const fresh = near && !lit.has(index);
      if (near) lit.add(index);
      else if (Math.abs(distance) > 23 || Math.abs(y - point.y) > height * .66) lit.delete(index);
      if ((!fresh && !crossed) || now - caughtAt[index] < 180) continue;
      caughtAt[index] = now;

      const warmth = x < width / 2 ? .94 : .18;
      motes.push({ x: x + drift * .3, y: y + rise * .36, drift: drift * .4, rise: rise * .5,
        start: now, duration: 295, size: 26, warmth, pixel: false });
      for (let i = 0; i < 3; i++) {
        motes.push({ x: x + (i - 1) * 3, y: y - i * 2, drift: (i - 1) * 9 + drift * 1.3, rise: -17 - 9 * i,
          start: now + i * 35, duration: 420 + i * 105, size: 5.2 + (2 - i) * 1.5,
          warmth: i === 2 ? 1 - warmth : warmth, pixel: true });
      }
    }
    if (motes.length > 48) motes = motes.slice(-48);
  }

  function paint(now: number, placement: Placement, points: Spark[], withDust: boolean) {
    const elapsed = last ? Math.min(40, now - last) : 16;
    const settle = 1 - Math.exp(-elapsed / 33);
    const previous = reflection;
    const brightness = target ? .9 : 0;
    if (target && reflection && Math.hypot(target.x - reflection.x, target.y - reflection.y) > .24) {
      reflection = { x: reflection.x + (target.x - reflection.x) * settle, y: reflection.y + (target.y - reflection.y) * settle };
    } else if (target) reflection = target;
    opacity = Math.abs(brightness - opacity) < .009 ? brightness : opacity + (brightness - opacity) * settle;

    if (reflection) {
      const lift = (reflection.y - height / 2) * .6;
      glint.setAttribute("transform", `translate(${reflection.x} ${lift}) rotate(${angle(reflection)} 0 ${height / 2})`);
      glint.setAttribute("opacity", String(opacity));
      if (target && withDust && reflection !== previous) catchLight(now, reflection, previous);
    }
    if (!opacity && !target) reflection = undefined;

    motes = withDust ? motes.filter(mote => {
      const age = (now - mote.start) / mote.duration;
      if (age >= 1) return false;
      if (age < 0) return true;
      let x = mote.x + mote.drift * age, y = mote.y + mote.rise * age * (1.35 - .35 * age);
      if (mote.pixel) {
        x = Math.round(x / 2) * 2;
        y = Math.round(y / 2) * 2;
      }
      const shine = Math.min(1, age * 9) * (1 - age) ** 1.55;
      const twinkle = .82 + .18 * Math.cos(age * 11 + mote.y);
      points.push({ x: placement.x + x * placement.scale, y: placement.y + y * placement.scale,
        size: mote.size * (.88 + .12 * placement.scale) * (1 - .27 * age), opacity: shine * twinkle,
        warmth: mote.warmth, pixel: mote.pixel });
      return true;
    }) : [];

    const active = reflection !== target || opacity !== brightness || motes.length > 0;
    last = active ? now : 0;
    return active;
  }

  function leave() {
    if (!target) return false;
    target = undefined;
    lit.clear();
    return true;
  }

  function reset() {
    leave();
    reflection = undefined;
    opacity = last = 0;
    motes = [];
    caughtAt.fill(-Infinity);
    glint.setAttribute("opacity", "0");
  }

  return { aim(x: number, y: number) { target = { x, y }; }, leave, reset, paint };
}
