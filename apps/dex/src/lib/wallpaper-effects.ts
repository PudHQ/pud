import { circuitCharge } from "./wallpaper-circuit";
import { brickPush, corkPin, shootingStar, waterRipple } from "./wallpaper-reactions";
import { clamp } from "./wallpaper-paint";
import type { Area, Point, Reaction, WallpaperTap } from "./wallpaper-paint";

const reactions: Partial<Record<string, (tap: WallpaperTap) => Reaction>> = {
  brick: brickPush, corkboard: corkPin, starfield: shootingStar, circuit: circuitCharge, aquarium: waterRipple,
};

interface Playing { reaction: Reaction; started: number }
interface Scene { marks: Map<string, Playing>; bursts: Playing[] }

function exposedGutter(point: Point, viewport: Area, wiki: Area): Area {
  if (point.y < wiki.top) return { ...viewport, bottom: Math.min(wiki.top, viewport.bottom) };
  if (point.y >= wiki.bottom) return { ...viewport, top: Math.max(wiki.bottom, viewport.top) };
  if (point.x < wiki.left) return { ...viewport, right: wiki.left };
  return { ...viewport, left: wiki.right };
}

export function mountWallpaperEffects(backdrop: HTMLElement, picker: HTMLFieldSetElement, desktop: HTMLElement) {
  const canvas = backdrop.querySelector("canvas")!;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scenes = new Map<string, Scene>();
  let context: CanvasRenderingContext2D | null = null;
  let frame = 0, timer = 0;

  function selected() {
    return picker.querySelector<HTMLInputElement>("input:checked")?.value ?? "plain";
  }

  function paint(now: number) {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = timer = 0;
    if (!context || document.hidden) return;

    const scene = scenes.get(selected());
    const stillDuration = 650;
    if (scene) scene.bursts = scene.bursts.filter(({ reaction, started }) => now - started < (motion.matches ? stillDuration : reaction.duration));
    if (!scene?.marks.size && !scene?.bursts.length) {
      if (canvas.width !== 1 || canvas.height !== 1) canvas.width = canvas.height = 1;
      return;
    }
    const width = backdrop.clientWidth, height = backdrop.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = false;
    }
    context.clearRect(0, 0, width, height);

    let moving = false;
    let nextExpiry = Infinity;
    for (const { reaction, started } of scene.marks.values()) {
      const progress = clamp((now - started) / reaction.duration);
      if (motion.matches || progress >= 1) reaction.mark?.draw(context);
      else {
        reaction.draw(context, progress);
        moving = true;
      }
    }
    for (const { reaction, started } of scene.bursts) {
      if (motion.matches) {
        reaction.still?.(context);
        nextExpiry = Math.min(nextExpiry, started + stillDuration);
      } else {
        reaction.draw(context, clamp((now - started) / reaction.duration));
        moving = true;
      }
    }

    if (moving) frame = requestAnimationFrame(paint);
    else if (nextExpiry < Infinity) timer = window.setTimeout(refresh, Math.ceil(nextExpiry - now));
  }

  function refresh() { paint(performance.now()); }

  backdrop.addEventListener("click", event => {
    if (event.button !== 0 || !event.detail || event.defaultPrevented) return;
    const theme = selected();
    const react = reactions[theme];
    if (!react) return;
    context ??= canvas.getContext("2d");
    if (!context) return;

    const point = { x: Math.round(event.clientX), y: Math.round(event.clientY) };
    const viewport = { left: 0, top: 0, right: backdrop.clientWidth, bottom: backdrop.clientHeight };
    const wiki = desktop.getBoundingClientRect();
    const reaction = react({ point, viewport, wiki, gutter: exposedGutter(point, viewport, wiki) });
    const scene: Scene = scenes.get(theme) ?? { marks: new Map(), bursts: [] };
    const playing = { reaction, started: performance.now() };
    if (reaction.mark) {
      if (theme === "brick" && scene.marks.has(reaction.mark.key)) return;
      scene.marks.set(reaction.mark.key, playing);
    } else {
      if (scene.bursts.length >= 16) scene.bursts.shift();
      scene.bursts.push(playing);
    }
    scenes.set(theme, scene);
    refresh();
  });

  picker.addEventListener("wallpaperchange", refresh);
  window.addEventListener("resize", refresh);
  document.addEventListener("visibilitychange", refresh);
  motion.addEventListener("change", refresh);
}
