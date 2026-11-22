import { height, radius, ring, width } from "./globe";
import { createOrbitSparks, type Spark } from "./orbit-sparks";
import { bevels, createStampLight } from "./orbit-stamp-light";

const launchTime = 220;
const orbitStart = 410;
const orbitEnd = 1190;
const tailLength = 7;
const tailStep = 19;
const ringAngle = ring.angle * Math.PI / 180;
const ringCos = Math.cos(ringAngle);
const ringSin = Math.sin(ringAngle);
interface Pulse { start: number; beacon: HTMLElement }

export function mountOrbitStamp(mast: HTMLElement, signal: AbortSignal) {
  const stamp = mast.querySelector<SVGSVGElement>("[data-orbit-stamp]");
  const glint = stamp?.querySelector<SVGGElement>("[data-stamp-glint]");
  const button = mast.querySelector<HTMLButtonElement>("[data-orbit-trigger]");
  const world = mast.querySelector<SVGSVGElement>("[data-orbit-world]");
  const canvas = mast.querySelector<HTMLCanvasElement>("[data-orbit-sparks]");
  const template = mast.querySelector<HTMLTemplateElement>("[data-orbit-beacon]");
  const marker = template?.content.querySelector<HTMLElement>("[data-orbit-signal]");
  if (!stamp || !glint || !button || !world || !canvas || !marker) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const mark = stamp.viewBox.baseVal;
  const light = createStampLight(glint, mark.width, mark.height);
  let frame = 0;
  let pulses: Pulse[] = [];
  let sparks: ReturnType<typeof createOrbitSparks> | null;

  const rest = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const { beacon } of pulses) beacon.remove();
    pulses = [];
    canvas.hidden = true;
    light.reset();
  };

  const animate = () => {
    if (sparks === undefined) sparks = createOrbitSparks(canvas) ?? null;
    sparks?.resize(mast.clientWidth, mast.clientHeight);

    const bounds = mast.getBoundingClientRect();
    const stampBox = stamp.getBoundingClientRect();
    const worldBox = world.getBoundingClientRect();
    const stampScale = stampBox.width / mark.width;
    const worldScale = Math.min(worldBox.width / width, worldBox.height / height);
    const stampX = stampBox.left - bounds.left - mast.clientLeft;
    const stampY = stampBox.top - bounds.top - mast.clientTop;
    const placement = { x: stampX, y: stampY, scale: stampScale };
    const worldX = worldBox.left - bounds.left - mast.clientLeft + (worldBox.width - width * worldScale) / 2;
    const worldY = worldBox.top - bounds.top - mast.clientTop + (worldBox.height - height * worldScale) / 2;
    const launchX = stampX + mark.width * .93 * stampScale;
    const launchY = stampY + mark.height * .55 * stampScale;
    const entryX = worldX + (ring.cx - ring.rx * ringCos) * worldScale;
    const entryY = worldY + (ring.cy - ring.rx * ringSin) * worldScale;

    function flight(age: number) {
      if (age < launchTime || age >= orbitEnd) return;
      if (age < orbitStart) {
        const t = (age - launchTime) / (orbitStart - launchTime);
        return {
          x: launchX + (entryX - launchX) * t,
          y: launchY + (entryY - launchY) * t - 9 * Math.sin(Math.PI * t),
        };
      }
      const phase = Math.PI - 2 * Math.PI * (age - orbitStart) / (orbitEnd - orbitStart);
      const major = ring.rx * Math.cos(phase), minor = ring.ry * Math.sin(phase);
      const x = major * ringCos - minor * ringSin;
      const y = major * ringSin + minor * ringCos;
      if (minor < 0 && Math.hypot(x, y) < radius) return;
      return { x: worldX + (ring.cx + x) * worldScale, y: worldY + (ring.cy + y) * worldScale };
    }

    const draw = (now: number) => {
      const points: Spark[] = [];
      const hovering = light.paint(now, placement, points, Boolean(sparks));
      pulses = pulses.filter(pulse => {
        const age = now - pulse.start;
        const { beacon } = pulse;
        if (age >= orbitEnd + (tailLength - 1) * tailStep) {
          beacon.remove();
          return false;
        }

        const head = flight(age);
        beacon.hidden = !head;
        if (head) {
          beacon.style.transform = `translate(${head.x}px, ${head.y}px)`;
          beacon.style.opacity = String(Math.min(1, (age - launchTime) / 45, (orbitEnd - age) / 100));
        }
        if (sparks) {
          for (const [x, y, drift, rise] of bevels) {
            const local = (age - 128 * x / mark.width) / 275;
            if (local < 0 || local >= 1) continue;
            points.push({ x: stampX + x * stampScale + drift * local, y: stampY + y * stampScale + rise * local,
              size: 10 + 13 * (1 - local), opacity: Math.sin(Math.PI * local) * .85, warmth: x < mark.width / 2 ? 1 : .25 });
          }
          for (let i = 0; i < tailLength; i++) {
            const point = flight(age - i * tailStep);
            if (point) points.push({ ...point, size: 26 - i * 3, opacity: .84 / (1 + i * .63), warmth: 1 - i / 10 });
          }
        }
        return true;
      });

      const hidden = !sparks || !points.length;
      if (canvas.hidden !== hidden) canvas.hidden = hidden;
      if (!hidden) sparks?.draw(points);
      frame = hovering || pulses.length ? requestAnimationFrame(draw) : 0;
    };
    frame = requestAnimationFrame(draw);
  };

  const setMotion = () => {
    rest();
    button.hidden = motion.matches;
  };

  button.addEventListener("pointermove", event => {
    if (motion.matches || event.pointerType === "touch") return;
    const box = stamp.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width * mark.width;
    const y = Math.max(0, Math.min(mark.height, (event.clientY - box.top) / box.height * mark.height));
    light.aim(x, y);
    if (!frame) animate();
  }, { signal });
  button.addEventListener("pointerleave", () => { if (light.leave() && !frame) animate(); }, { signal });
  button.addEventListener("click", () => {
    if (motion.matches || document.hidden) return;
    if (!frame) animate();
    const beacon = marker.cloneNode() as HTMLElement;
    mast.append(beacon);
    pulses.push({ beacon, start: performance.now() });
  }, { signal });
  motion.addEventListener("change", setMotion, { signal });
  window.addEventListener("resize", rest, { signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) rest(); }, { signal });
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    sparks = null;
    canvas.hidden = true;
  }, { signal });
  canvas.addEventListener("webglcontextrestored", () => { sparks = undefined; }, { signal });
  window.addEventListener("pagehide", event => {
    rest();
    if (!event.persisted) sparks?.destroy();
  }, { signal });
  signal.addEventListener("abort", () => { rest(); sparks?.destroy(); }, { once: true });
  setMotion();
}
