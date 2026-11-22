const course = [
  { x: 104, width: 7, height: 6 },
  { x: 194, width: 10, height: 7 },
  { x: 280, width: 7, height: 8 },
  { x: 385, width: 11, height: 7 },
  { x: 471, width: 9, height: 8 },
];
const courseLength = 490;
const runnerX = 26;
const spriteSize = 15;
const jumpLength = 39;
const jumpHeight = 10;
const interactive = "a[href],button,input,select,textarea,summary,[contenteditable]:not([contenteditable=false]),[role=button]";

type Phase = "ready" | "running" | "paused" | "crashed";
const controls = {
  ready: { action: "Start Pud Runner", label: "Play", glyph: "▶", status: "" },
  running: { action: "Pause Pud Runner", label: "Pause", glyph: "Ⅱ", status: "" },
  paused: { action: "Resume Pud Runner", label: "Resume", glyph: "▶", status: "Paused" },
  crashed: { action: "Retry Pud Runner", label: "Retry", glyph: "↻", status: "Game over" },
};

export function mountRunner(bar: HTMLElement, wake: () => void, pixelsPerMs: number, signal: AbortSignal) {
  const picker = bar.querySelector<HTMLDetailsElement>("[data-widget-picker]")!;
  const view = bar.querySelector<HTMLElement>("[data-widget-runner]")!;
  const canvas = bar.querySelector<HTMLCanvasElement>("[data-runner-board]")!;
  const ctx = canvas.getContext("2d");
  const jumpButton = bar.querySelector<HTMLButtonElement>("[data-runner-jump]")!;
  const action = bar.querySelector<HTMLButtonElement>("[data-runner-action]")!;
  const actionIcon = action.querySelector<HTMLElement>("[data-runner-action-icon]")!;
  const actionLabel = action.querySelector<HTMLElement>("[data-runner-action-label]")!;
  const status = bar.querySelector<HTMLElement>("[data-runner-status]")!;
  const hint = bar.querySelector<HTMLElement>("[data-runner-hint]")!;
  const score = bar.querySelector<HTMLOutputElement>("[data-runner-score]")!;
  const image = bar.querySelector<HTMLImageElement>("[data-runner-sprite]")!;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = spriteSize;
  const spriteCtx = sprite.getContext("2d", { willReadFrequently: true });
  const style = getComputedStyle(bar);
  const color = (shade: number) => style.getPropertyValue(`--color-slate-${shade}`).trim();
  const palette = { ground: color(600), stars: color(700), obstacle: color(400), shine: color(200), foot: color(300) };

  let phase: Phase = "ready";
  let distance = 0;
  let elevation = 0;
  let jumpStart: number | undefined;
  let landedAt = -Infinity;
  let points = 0;
  let spriteReady = false;
  let testClock = false;

  function prepareSprite() {
    if (!spriteCtx || !image.naturalWidth) return;
    spriteCtx.imageSmoothingEnabled = false;
    spriteCtx.drawImage(image, 0, 0, spriteSize, spriteSize);
    const pixels = spriteCtx.getImageData(0, 0, spriteSize, spriteSize);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const shade = (pixels.data[i] * 0.21 + pixels.data[i + 1] * 0.72 + pixels.data[i + 2] * 0.07);
      const gray = Math.round(shade / 51) * 51;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
    }
    spriteCtx.putImageData(pixels, 0, 0);
    spriteReady = true;
    paint();
  }

  function obstacles() {
    const visible = [];
    for (let offset = -(distance % courseLength); offset < canvas.width; offset += courseLength) {
      for (const obstacle of course) {
        const x = Math.round(offset + obstacle.x);
        if (x + obstacle.width > 0 && x < canvas.width) visible.push({ ...obstacle, x });
      }
    }
    return visible;
  }

  function paint() {
    if (!ctx) return;
    const { width, height } = canvas;
    if (!width || !height) return;
    const floor = height - 5;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, floor, width, 1);
    for (let x = -Math.round(distance % 24); x < width; x += 24) {
      ctx.fillRect(x, floor + 3, 7, 1);
    }
    ctx.fillStyle = palette.stars;
    for (let x = -Math.round(distance / 2 % 61); x < width; x += 61) {
      ctx.fillRect(x, 5, 2, 1);
      ctx.fillRect(x + 19, 12, 3, 1);
      ctx.fillRect(x + 20, 11, 1, 3);
    }
    for (const obstacle of obstacles()) {
      const top = floor - obstacle.height;
      ctx.fillStyle = palette.obstacle;
      ctx.fillRect(obstacle.x, top + 2, obstacle.width, obstacle.height - 2);
      ctx.fillRect(obstacle.x + 1, top, obstacle.width - 2, 2);
      ctx.fillStyle = palette.ground;
      ctx.fillRect(obstacle.x + 2, top + 3, obstacle.width - 4, 2);
    }
    const y = floor - Math.round(elevation) - spriteSize;
    if (spriteReady) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, runnerX, y);
    } else {
      ctx.fillStyle = palette.shine;
      ctx.fillRect(runnerX + 3, y + 5, 12, 12);
    }
    if (!elevation) {
      const stride = Math.floor(distance / 5) % 2;
      ctx.fillStyle = palette.foot;
      ctx.fillRect(runnerX + 5 + stride * 3, floor - 1, 4, 1);
      ctx.fillRect(runnerX + 13 - stride * 2, floor - 2, 3, 1);
    }
    const dust = Math.round(distance - landedAt);
    if (dust < 9) {
      ctx.fillStyle = dust < 4 ? palette.obstacle : palette.ground;
      ctx.fillRect(runnerX - dust + 1, floor - 2, 2, 1);
      ctx.fillRect(runnerX - dust - 3, floor - 4, 1, 1);
    }
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    paint();
  }

  function setPhase(next: Phase) {
    phase = next;
    const { action: name, label, glyph, status: message } = controls[next];
    action.ariaLabel = action.title = name;
    actionIcon.textContent = glyph;
    actionLabel.textContent = label;
    status.textContent = message;
    hint.hidden = next !== "ready";
    wake();
  }

  function start() {
    distance = elevation = points = 0;
    jumpStart = undefined;
    landedAt = -Infinity;
    score.value = "000";
    setPhase("running");
    jumpButton.focus({ preventScroll: true });
    paint();
  }

  function jump() {
    if (phase === "ready" || phase === "crashed") start();
    if (phase === "paused") resume();
    jumpStart ??= distance;
  }

  function step(travel: number) {
    distance += travel;
    if (phase === "running") {
      const progress = jumpStart === undefined ? 0 : (distance - jumpStart) / jumpLength;
      elevation = progress >= 1 ? 0 : 4 * jumpHeight * progress * (1 - progress);
      if (progress >= 1) {
        jumpStart = undefined;
        landedAt = distance;
      }
      const hit = obstacles().some(({ x, width, height }) =>
        x < runnerX + 13 && x + width > runnerX + 4 && height > elevation + 2);
      if (hit) setPhase("crashed");
      const next = Math.floor(distance / 10);
      if (next !== points) {
        points = next;
        score.value = String(points).padStart(3, "0");
      }
    }
    paint();
  }

  const pause = () => { if (phase === "running") setPhase("paused"); };
  function resume() {
    setPhase("running");
    jumpButton.focus({ preventScroll: true });
  }
  action.addEventListener("click", () => {
    if (phase === "running") pause();
    else if (phase === "paused") resume();
    else start();
  }, { signal });
  jumpButton.addEventListener("click", jump, { signal });
  document.addEventListener("keydown", event => {
    if (view.hidden || picker.open || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (target instanceof Element && target !== jumpButton && target !== action && target.closest(interactive)) return;
    if (event.key === "Escape") pause();
    if (event.key !== " " && event.key !== "ArrowUp") return;
    if (target === action && event.key === " " && phase === "running") return;
    event.preventDefault();
    if (!event.repeat) jump();
  }, { signal });
  image.addEventListener("load", prepareSprite, { signal });
  if (image.complete) prepareSprite();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  signal.addEventListener("abort", () => observer.disconnect(), { once: true });

  if (import.meta.env.DEV) {
    const debug = window as Window & {
      render_game_to_text?: () => string;
      advanceTime?: (ms: number) => void | Promise<void>;
    };
    const priorAdvance = debug.advanceTime;
    debug.render_game_to_text = () => JSON.stringify({
      coordinates: "Pixels from the left of the strip; elevation measured above the ground",
      phase, distance, elevation, points, playerX: runnerX, obstacles: obstacles(),
    });
    debug.advanceTime = ms => {
      if (view.hidden) return priorAdvance?.(ms);
      testClock = true;
      for (let remaining = ms; remaining > 0 && phase === "running"; ) {
        const interval = Math.min(remaining, 1000 / 60);
        step(interval * pixelsPerMs);
        remaining -= interval;
      }
      wake();
    };
    signal.addEventListener("abort", () => {
      debug.advanceTime = priorAdvance;
      delete debug.render_game_to_text;
    }, { once: true });
  }

  return {
    step,
    pause,
    get scrolling() { return !testClock && phase === "running"; },
    get idle() { return !testClock && phase === "ready"; },
  };
}
