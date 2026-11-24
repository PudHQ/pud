"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createStarCharge } from "./github-star-charge";
import { curtainArt, OctocatSpeech, speechCount, speechFade, StarCurtain } from "./github-star-comic";
import { createSpotlight, paintSpotlight, type Point, resetChargeSchedule, type SpotlightLayout } from "./github-star-light";
import { loadFollowspotArt } from "./github-star-operator";

const unit = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);
const speechPause = 1000;
const speechInterval = 5000;

function fade(value: number, active: boolean, delta: number, enter: number, leave: number) {
  return unit(value + (active ? delta / enter : -delta / leave));
}

function attachSpotlight(
  link: HTMLAnchorElement,
  face: HTMLSpanElement,
  medallion: HTMLSpanElement,
  meter: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  curtain: HTMLDialogElement,
  setSpeech: (line: number | null) => void,
) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const style = getComputedStyle(link);
  const art = loadFollowspotArt(style);
  const chargeMeter = createStarCharge(meter, style);
  let context: CanvasRenderingContext2D | null = null;
  let show: ReturnType<typeof createSpotlight> | undefined;
  let layout: SpotlightLayout | undefined;
  let pointer: (Point & { otherControl: boolean }) | undefined;
  let targetPan = { x: 0, y: 0 };
  let pan = { x: 0, y: 0 };
  let hovered = window.matchMedia("(hover: hover)").matches && link.matches(":hover");
  let overButton = hovered;
  let focused = link.matches(":focus-visible");
  let dismissed = false;
  let frame = 0;
  let light = 0;
  let park = 0;
  let glide = 0;
  let energy = 0;
  let bank = 0;
  let startedAt = 0;
  let chargeStartedAt: number | null = null;
  let lastFrame = 0;
  let speechTimer: number | undefined;
  let speechStarted = false;
  let curtainPlaying = false;

  const wantsLight = () => (hovered || focused) && !dismissed && !curtainPlaying && !document.hidden;

  function stopSpeech() {
    window.clearTimeout(speechTimer);
    speechTimer = undefined;
    if (speechStarted) setSpeech(null);
    speechStarted = false;
  }

  function showCurtain() {
    if (!overButton || !wantsLight()) return;
    curtainPlaying = true;
    dismissed = true;
    clearPointer();
    curtain.showModal();
    curtain.querySelector("button")?.focus({ preventScroll: true });
    updateCue();
  }

  function curtainClosed() {
    curtainPlaying = false;
  }

  function cueSpeech(line: number, delay: number) {
    speechTimer = window.setTimeout(() => {
      speechTimer = undefined;
      if (!overButton || !wantsLight()) {
        stopSpeech();
        return;
      }
      speechStarted = true;
      setSpeech(line);
      if (line + 1 < speechCount) {
        const gap = speechFade + speechPause;
        speechTimer = window.setTimeout(() => {
          setSpeech(null);
          cueSpeech(line + 1, gap);
        }, speechInterval - gap);
      } else {
        for (const { src } of curtainArt) {
          const preview = new Image();
          preview.src = src;
        }
        speechTimer = window.setTimeout(showCurtain, speechInterval);
      }
    }, delay);
  }

  function updateButtonHover(inside: boolean) {
    if (overButton && !inside) {
      stopSpeech();
      if (!focused) chargeStartedAt = null;
    }
    overButton = inside;
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    light = park = glide = energy = bank = 0;
    chargeStartedAt = null;
    stopSpeech();
    show = undefined;
    pan = { x: 0, y: 0 };
    canvas.hidden = true;
    face.style.removeProperty("transform");
    chargeMeter.clear();
    link.style.removeProperty("--star-preview");
    link.style.removeProperty("--star-power");
    link.style.removeProperty("--star-bloom");
    link.style.removeProperty("--star-charge");
    link.style.removeProperty("--star-flash");
    link.style.removeProperty("--star-speech-pan");
    link.removeAttribute("data-spotlight");
    link.removeAttribute("data-shimmer");
    link.removeAttribute("data-charging");
    link.removeAttribute("data-energized");
    link.removeAttribute("data-charged");
  }

  function paint(now: number) {
    frame = 0;
    if (!context || !show || !layout) return;
    const active = wantsLight();
    const reduced = motion.matches;
    const charging = active && (overButton || focused);
    const preview = active && !charging;
    const delta = Math.min(40, Math.max(0, now - lastFrame));
    lastFrame = now;
    light = reduced ? Number(active) : fade(light, active, delta, 124, 320);
    if (!active && light === 0) {
      stop();
      return;
    }

    park = fade(park, !active, delta, 320, 215);
    glide = reduced ? Number(preview) : fade(glide, preview, delta, 146, 192);
    const wasEnergized = energy > 0;
    energy = reduced ? Number(charging) : fade(energy, charging, delta, 146, 245);
    if (charging && chargeStartedAt === null) {
      resetChargeSchedule(show);
      chargeStartedAt = now;
    } else if (!charging) {
      chargeStartedAt = null;
    }

    const chargeAge = chargeStartedAt === null ? null : now - chargeStartedAt;
    const charge = chargeAge === null ? 0 : reduced ? 1 : unit((chargeAge - 95) / 2685);
    if (charge === 1 && overButton) {
      if (speechTimer === undefined && !speechStarted) cueSpeech(0, 1000);
    } else if (speechTimer !== undefined || speechStarted) {
      stopSpeech();
    }
    bank = reduced ? charge : bank + (charge - bank) * (1 - Math.exp(-delta / (charge < bank ? 86 : 24)));
    if (energy === 0 || charge === 1 && bank >= 0.995) bank = charge;

    const opacity = ease(light);
    const shimmer = ease(glide);
    const power = ease(energy);
    const drift = reduced ? 0 : 1 - Math.exp(-delta / 62);
    pan.x += (targetPan.x - pan.x) * drift;
    pan.y += (targetPan.y - pan.y) * drift;
    const stretch = Math.min(0.31, Math.hypot(pan.x, pan.y) * 0.24
      + Math.hypot(targetPan.x - pan.x, targetPan.y - pan.y) * drift * 0.13);
    const age = now - startedAt;
    const { shake, impact } = paintSpotlight(context, layout, show, {
      age, opacity, retreat: ease(park), shimmer, power, charge: bank, chargeAge, reduced, pan, stretch, art,
    });
    canvas.hidden = false;
    if (power > 0) chargeMeter.paint(reduced ? 0 : age, bank, power, impact);
    else if (wasEnergized) chargeMeter.clear();

    const pulse = reduced ? 0 : 0.5 + 0.5 * Math.sin(age / 185);
    link.style.setProperty("--star-preview", String(shimmer));
    link.style.setProperty("--star-power", String(power));
    link.style.setProperty("--star-bloom", String(power * (0.54 + bank * (0.12 * pulse + 0.1 * impact))));
    link.style.setProperty("--star-charge", String(power * ease(bank)));
    link.style.setProperty("--star-flash", String(impact * power));
    link.toggleAttribute("data-shimmer", preview);
    link.toggleAttribute("data-charging", charging);
    link.toggleAttribute("data-energized", charging || energy > 0);
    link.toggleAttribute("data-charged", charge === 1);
    if (!reduced) {
      const tilt = opacity * (0.22 + 0.78 * power);
      face.style.transform = `perspective(440px) translate(${shake.x + pan.x * 2 * tilt}px, ${shake.y - 0.6 * shimmer - 1.5 * power}px)
        rotateX(${-pan.y * 9 * tilt}deg) rotateY(${pan.x * 13 * tilt}deg) rotateZ(${shake.roll}deg)`;
      if (speechStarted) {
        link.style.setProperty("--star-speech-pan",
          `perspective(340px) rotateX(${-pan.y * 16}deg) rotateY(${pan.x * 20}deg) rotateZ(${pan.x * -2.5}deg)`);
      }
      frame = requestAnimationFrame(paint);
    }
  }

  function updateCue() {
    if (!layout || (!wantsLight() && !show)) return;
    const { width, height } = layout;
    context ??= canvas.getContext("2d");
    if (!context) return;

    // The viewport-wide gradients can use a smaller backing store on dense displays.
    const ratio = Math.min(window.devicePixelRatio, 1.4, Math.sqrt(1_180_000 / (width * height)));
    const pixelsWide = Math.max(1, Math.round(width * ratio));
    const pixelsHigh = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }
    context.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);

    if (!show) {
      show = createSpotlight(style);
      startedAt = lastFrame = performance.now();
      link.setAttribute("data-spotlight", "");
      paint(startedAt);
    } else if (motion.matches) {
      paint(performance.now());
    } else if (!frame) {
      frame = requestAnimationFrame(paint);
    }
  }

  function updateAim() {
    if (!pointer || !layout) return;
    const { link: bounds, width, height } = layout;
    const radiusX = bounds.width / 2 + Math.min(102, Math.max(43, width * 0.065));
    const radiusY = bounds.height / 2 + Math.min(77, Math.max(43, height * 0.082));
    const x = (pointer.x - bounds.left - bounds.width / 2) / radiusX;
    const y = (pointer.y - bounds.top - bounds.height / 2) / radiusY;
    const inside = !pointer.otherControl && x * x + y * y <= 1;
    if (inside && !hovered) dismissed = false;
    hovered = inside;
    updateButtonHover(inside && pointer.x >= bounds.left && pointer.x <= bounds.right
      && pointer.y >= bounds.top && pointer.y <= bounds.bottom);
    targetPan = inside ? { x, y } : { x: 0, y: 0 };
  }

  function refresh() {
    const { clientWidth: width, clientHeight: height } = document.documentElement;
    const bounds = link.getBoundingClientRect();
    if (!width || !height || bounds.bottom <= 0 || bounds.top >= height) {
      layout = undefined;
      hovered = false;
      overButton = false;
      stop();
      return;
    }

    // Offset metrics keep the emitter and speech tail tied to the unshaken face.
    const emitterX = face.clientLeft + medallion.offsetLeft + medallion.offsetWidth / 2;
    const emitterY = face.clientTop + medallion.offsetTop + medallion.offsetHeight / 2;
    layout = {
      width, height, link: bounds,
      emitter: { x: bounds.left + emitterX, y: bounds.top + emitterY },
    };
    link.style.setProperty("--star-mouth-x", `${emitterX}px`);
    link.style.setProperty("--star-mouth-y", `${emitterY + medallion.offsetHeight * 0.19}px`);
    chargeMeter.resize(meter.clientWidth, meter.clientHeight);
    updateAim();
    updateCue();
  }

  function trackPointer(event: PointerEvent) {
    if (event.pointerType === "touch" || curtainPlaying) return;
    const control = event.target instanceof Element ? event.target.closest("a[href], button") : null;
    pointer = { x: event.clientX, y: event.clientY, otherControl: Boolean(control && control !== link) };
    const wasHovered = hovered;
    const wasOverButton = overButton;
    updateAim();
    if (wasHovered !== hovered || wasOverButton !== overButton) updateCue();
  }

  function clearPointer() {
    pointer = undefined;
    hovered = false;
    updateButtonHover(false);
    targetPan = { x: 0, y: 0 };
  }

  function leaveViewport(event: PointerEvent) {
    if (event.relatedTarget || event.pointerType === "touch") return;
    clearPointer();
    updateCue();
  }

  function focus() {
    focused = link.matches(":focus-visible");
    if (focused && !curtainPlaying) dismissed = false;
    refresh();
  }

  function blur() {
    focused = false;
    updateCue();
  }

  function dismissOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape" || !show) return;
    dismissed = true;
    chargeStartedAt = null;
    stopSpeech();
    updateCue();
  }

  function windowBlur() {
    clearPointer();
    dismissed = true;
    stop();
  }

  function visibility() {
    if (document.hidden) windowBlur();
  }

  function motionChange() {
    stop();
    updateCue();
  }

  const events = new AbortController();
  const { signal } = events;
  window.addEventListener("pointermove", trackPointer, { passive: true, signal });
  window.addEventListener("pointerout", leaveViewport, { signal });
  window.addEventListener("pointercancel", leaveViewport, { signal });
  link.addEventListener("focus", focus, { signal });
  link.addEventListener("blur", blur, { signal });
  curtain.addEventListener("close", curtainClosed, { signal });
  document.addEventListener("keydown", dismissOnEscape, { signal });
  document.addEventListener("visibilitychange", visibility, { signal });
  window.addEventListener("blur", windowBlur, { signal });
  window.addEventListener("resize", refresh, { signal });
  window.addEventListener("scroll", refresh, { passive: true, signal });
  motion.addEventListener("change", motionChange, { signal });

  const observer = new ResizeObserver(refresh);
  observer.observe(link);
  refresh();

  return () => {
    events.abort();
    observer.disconnect();
    stop();
  };
}

function Octocat() {
  return (
    <span aria-hidden="true" className="relative block size-8 drop-shadow-sm drop-shadow-black phone:size-4.5">
      <span className="absolute inset-0 bg-octocat-relief bg-size-(--background-size-octocat-relief) bg-left bg-no-repeat
        opacity-[calc(1_-_var(--star-power,0))]" />
      <span className="absolute inset-0 opacity-[var(--star-power,0)] motion-safe:group-data-energized:animate-octocat-startle">
        <span className="absolute inset-0 bg-octocat-relief bg-size-(--background-size-octocat-relief) bg-right bg-no-repeat
          motion-safe:group-data-energized:animate-octocat-shudder" />
      </span>
    </span>
  );
}

export function GitHubStarSpotlight({ href, children }: { href: string; children: ReactNode }) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const medallion = useRef<HTMLSpanElement>(null);
  const chargeFill = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const curtain = useRef<HTMLDialogElement>(null);
  const [speech, setSpeech] = useState<number | null>(null);

  useEffect(() => {
    const link = anchor.current;
    const face = panel.current;
    const icon = medallion.current;
    const meter = chargeFill.current;
    const canvas = overlay.current;
    const dialog = curtain.current;
    if (!link || !face || !icon || !meter || !canvas || !dialog) return;

    return attachSpotlight(link, face, icon, meter, canvas, dialog, setSpeech);
  }, []);

  return (
    <>
      <a
        ref={anchor}
        href={href}
        target="_blank"
        rel="noopener"
        className="group relative inline-flex rounded-xl text-pink-50 data-spotlight:z-50
          focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-200 phone:rounded-md"
      >
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1 -bottom-1 rounded-xl
          bg-linear-to-b from-fuchsia-950 via-violet-950 to-black shadow-md shadow-black/75
          inset-ring-1 inset-ring-pink-400/40 group-data-charging:from-blue-950 group-data-charging:via-slate-950
          group-data-charging:inset-ring-sky-400/45
          motion-safe:transition-[box-shadow,--tw-gradient-from,--tw-gradient-via] motion-safe:duration-220 phone:rounded-md" />
        <span ref={panel} className="relative isolate inline-flex min-h-12 min-w-50 items-center justify-between gap-2.5 rounded-xl
          px-2.5 text-sm font-bold tracking-tight whitespace-nowrap group-active:translate-y-1
          narrow:min-w-11 narrow:gap-1.5 narrow:px-1.5 narrow:text-xs
          phone:grid phone:min-h-11 phone:grid-cols-1 phone:place-content-center phone:justify-items-center phone:gap-x-0.5
          phone:gap-y-0.5 phone:rounded-md phone:px-1.5 phone:has-data-star-count:grid-cols-star-mobile small-phone:px-0.5">
          <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 -z-20 rounded-xl bg-fuchsia-400
            opacity-[calc(var(--star-preview,0)*.24)] blur-md phone:rounded-md" />
          <span aria-hidden="true" className="pointer-events-none absolute -inset-1.5 -z-20 rounded-xl bg-blue-500
            opacity-[var(--star-bloom,0)] blur-md phone:rounded-md" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl bg-star-chrome phone:rounded-md">
            <span className="absolute inset-0 bg-star-chrome-hot opacity-[var(--star-power,0)]" />
            <span className="absolute top-1/2 left-1/2 aspect-square w-5/4 -translate-1/2 bg-star-arc
              opacity-[calc(1_-_var(--star-power,0))] motion-safe:animate-star-rim" />
            <span className="absolute top-1/2 left-1/2 aspect-square w-5/4 -translate-1/2 bg-star-arc-hot
              opacity-[var(--star-power,0)] motion-safe:group-data-energized:animate-star-rim-hot" />
            <span className="absolute inset-px overflow-hidden rounded-xl bg-star-enamel phone:rounded-md">
              <span className="absolute inset-0 bg-star-enamel-hot opacity-[var(--star-power,0)]" />
              <canvas ref={chargeFill} className="absolute inset-0 size-full" />
              <span className="absolute inset-0 bg-crt-scanlines opacity-60" />
              <span className="absolute inset-0 bg-crt-glare" />
              <span className="absolute inset-y-0 left-1/4 w-3/4 -skew-x-20 bg-linear-to-r
                from-transparent via-pink-50/55 to-transparent opacity-0 mix-blend-screen motion-safe:animate-star-sheen" />
              <span className="absolute inset-0 opacity-[var(--star-preview,0)]">
                <span className="absolute inset-y-0 left-1/4 w-3/4 -skew-x-20 bg-linear-to-r
                  from-transparent via-violet-100/85 to-transparent opacity-0 mix-blend-screen
                  motion-safe:group-data-spotlight:animate-star-sheen-preview" />
              </span>
              <span className="absolute inset-0 opacity-[var(--star-power,0)]">
                <span className="absolute inset-y-0 left-1/4 w-3/4 -skew-x-20 bg-linear-to-r
                  from-transparent via-sky-100/55 to-transparent opacity-0 mix-blend-screen
                  motion-safe:group-data-energized:animate-star-sheen-hot" />
              </span>
              <span className="absolute inset-0 bg-linear-to-br from-cyan-100/50 via-blue-300/25 to-transparent
                opacity-[var(--star-flash,0)]" />
            </span>
          </span>

          <span ref={medallion} aria-hidden="true" className="relative grid size-8.5 shrink-0 place-items-center rounded-full
            border border-slate-500/65 bg-linear-to-br from-slate-800 via-slate-950 to-black
            inset-shadow-sm inset-shadow-black group-data-charging:border-sky-200/80 group-data-charging:from-blue-950
            motion-safe:transition-colors motion-safe:duration-220
            phone:row-start-2 phone:size-5">
            <Octocat />
            <span className="absolute inset-0 opacity-[var(--star-power,0)]">
              <span className="absolute -top-1 -right-0.5 size-3 clip-octocat-bolt bg-cyan-100 opacity-90
                motion-safe:group-data-energized:animate-star-twinkle-hot phone:size-2" />
              <span className="absolute top-0 -left-1.5 size-2.5 -rotate-20 clip-octocat-bolt bg-sky-200 opacity-80
                motion-safe:group-data-energized:animate-star-twinkle-offset phone:hidden" />
            </span>
          </span>

          <span className="relative isolate text-white group-data-charging:text-shadow-star-emboss
            motion-safe:transition-[text-shadow] motion-safe:duration-180
            before:pointer-events-none before:absolute before:-inset-x-1.5 before:-inset-y-1 before:-z-10
            before:rounded-md before:border before:border-sky-200/35 before:border-t-black
            before:bg-star-label-inset before:opacity-[var(--star-power,0)]
            phone:col-span-full phone:row-start-1 phone:leading-none phone:before:-inset-x-0.75 phone:before:-inset-y-0.5">
            <span className="phone:sr-only">Star on </span>GitHub
          </span>
          {children}

          <span aria-hidden="true" className="pointer-events-none absolute -top-1.5 right-3 size-3.5 clip-star-glint bg-cyan-100
            opacity-80 motion-safe:animate-star-twinkle-offset phone:hidden" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-1.5 left-1/3 size-2.5 clip-star-glint bg-pink-100
            group-data-charging:bg-sky-100 opacity-70 motion-safe:animate-star-twinkle motion-safe:transition-colors phone:hidden" />
        </span>
        <OctocatSpeech line={speech} />
      </a>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
        <canvas ref={overlay} hidden className="block h-full w-full" />
      </div>
      <StarCurtain dialog={curtain} />
    </>
  );
}
