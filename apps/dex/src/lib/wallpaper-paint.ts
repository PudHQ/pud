export interface Point { x: number; y: number }
export interface Area { left: number; top: number; right: number; bottom: number }
export interface WallpaperTap {
  point: Point;
  viewport: Area;
  wiki: Area;
  gutter: Area;
}

type Paint = (context: CanvasRenderingContext2D) => void;
export interface Reaction {
  duration: number;
  draw: (context: CanvasRenderingContext2D, progress: number) => void;
  mark?: { key: string; draw: Paint };
  still?: Paint;
}

export const between = (low: number, high: number) => low + Math.random() * (high - low);
export const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export const wrap = (value: number, size: number) => ((value % size) + size) % size;

export function variants<T>(values: readonly T[]) {
  let pending: T[] = [];
  let last: T;
  return () => {
    if (!pending.length) {
      pending = [...values];
      for (let i = pending.length - 1; i > 0; i--) {
        const j = Math.floor(between(0, i + 1));
        [pending[i], pending[j]] = [pending[j], pending[i]];
      }
      if (pending.length > 1 && pending[0] === last) [pending[0], pending[1]] = [pending[1], pending[0]];
    }
    last = pending.shift()!;
    return last;
  };
}

export function texture(name: string) {
  let image: HTMLImageElement | undefined;
  return () => {
    if (!image) {
      image = new Image();
      image.src = `/wallpapers/${name}.png`;
    }
    return image;
  };
}

export function cross(context: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const left = Math.round(x), top = Math.round(y);
  context.fillRect(left - radius, top, radius * 2 + 1, 1);
  context.fillRect(left, top - radius, 1, radius * 2 + 1);
}
