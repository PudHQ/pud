import { navigate } from "astro:transitions/client";

export const teletextAttribute = "data-dex-teletext";
export const teletextChange = "dex:teletext";
const preferenceKey = "puddex:teletext";
const entrySelector = "[data-teletext-entry]";
const keySelector = "[data-teletext-key]";
const pressableSelector = `${keySelector}, [data-teletext-exit]`;
let launch: { pathname: string; x: number; y: number } | undefined;

export function mountTeletext(controls: HTMLElement, signal: AbortSignal) {
  const root = document.documentElement;
  const launcher = document.querySelector<HTMLButtonElement>("[data-teletext-launch]")!;
  const exit = document.querySelector<HTMLAnchorElement>("[data-teletext-exit]")!;
  const reading = document.querySelector<HTMLElement>("[data-teletext-reading]")!;
  const main = document.getElementById("content")!;
  const channel = controls.querySelector<HTMLElement>("[data-teletext-number]")!;
  const status = controls.querySelector<HTMLElement>("[data-teletext-status]")!;
  const shortcuts = new Map(Array.from(controls.querySelectorAll<HTMLAnchorElement>(`a${keySelector}`),
    link => [link.dataset.teletextKey!, link]));
  const pages: Record<string, string> = JSON.parse(controls.dataset.pages!);
  const pageNumbers = Object.keys(pages);
  const active = () => root.hasAttribute(teletextAttribute);
  let digits = "";
  let timeout = 0;
  let selected: HTMLAnchorElement | null = null;
  let pressed: { key: HTMLElement; pointerId: number } | undefined;

  function releaseTouch(pointerId?: number) {
    if (!pressed || (pointerId !== undefined && pressed.pointerId !== pointerId)) return;
    pressed.key.removeAttribute("data-teletext-pressed");
    pressed = undefined;
  }

  function resetChannel() {
    clearTimeout(timeout);
    digits = "";
    channel.textContent = controls.dataset.page!;
    status.textContent = "";
  }

  function tune() {
    const number = digits;
    const href = pages[number];
    resetChannel();
    if (!href) status.textContent = `Channel ${number} is unavailable.`;
    else if (href !== location.pathname) void navigate(href);
  }

  function updateChannel() {
    clearTimeout(timeout);
    status.textContent = "";
    channel.textContent = digits.padEnd(3, "–");
    if (digits.length < 3) return;
    const longerMatch = pageNumbers.some(number => number.length > digits.length && number.startsWith(digits));
    if (longerMatch) timeout = window.setTimeout(tune, 1200);
    else tune();
  }

  function setView(enabled: boolean) {
    resetChannel();
    highlight(null);
    releaseTouch();
    if (enabled) launch = { pathname: location.pathname, x: window.scrollX, y: window.scrollY };
    root.toggleAttribute(teletextAttribute, enabled);
    document.dispatchEvent(new Event(teletextChange));
    try {
      if (enabled) sessionStorage.setItem(preferenceKey, "on");
      else sessionStorage.removeItem(preferenceKey);
    } catch {
      // The alternate view can still follow Astro navigation without browser storage.
    }
    if (enabled) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      exit.focus({ preventScroll: true });
    } else {
      const returnPoint = launch?.pathname === location.pathname ? launch : undefined;
      window.scrollTo({ top: returnPoint?.y ?? 0, left: returnPoint?.x ?? 0, behavior: "instant" });
      (returnPoint ? launcher : main).focus({ preventScroll: true });
      launch = undefined;
    }
  }

  function highlight(entry: HTMLAnchorElement | null) {
    if (selected === entry) return;
    selected?.removeAttribute("data-teletext-selected");
    selected = entry;
    selected?.setAttribute("data-teletext-selected", "");
  }

  function move(direction: number, keyboard: boolean) {
    const entries = [...document.querySelectorAll<HTMLAnchorElement>(entrySelector)]
      .filter(entry => entry.getClientRects().length > 0);
    if (!entries.length) {
      const docked = getComputedStyle(reading).overflowY === "auto";
      const height = docked ? reading.clientHeight : window.innerHeight;
      const distance = keyboard ? 40 : Math.min(144, height * 0.6);
      (docked ? reading : window).scrollBy({ top: direction * distance, behavior: "instant" });
      return;
    }
    const index = selected ? entries.indexOf(selected) : -1;
    const entry = index < 0
      ? (direction > 0 ? entries[0] : entries.at(-1)!)
      : entries[Math.max(0, Math.min(index + direction, entries.length - 1))];
    highlight(entry);
    if (keyboard) entry.focus({ preventScroll: true });
    entry.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function useKey(key: string, keyboard: boolean, repeat = false) {
    if (key === "Escape") {
      setView(false);
      return true;
    }
    if (/^\d$/.test(key)) {
      if (!repeat) {
        digits += key;
        updateChannel();
      }
      return true;
    }
    if (digits && key === "Backspace") {
      digits = digits.slice(0, -1);
      if (digits) updateChannel();
      else resetChannel();
      return true;
    }
    if (key === "Enter") {
      if (digits) tune();
      else if (!keyboard) selected?.click();
      else return false;
      return true;
    }
    if (key === "ArrowDown" || key === "ArrowUp") {
      move(key === "ArrowDown" ? 1 : -1, keyboard);
      return true;
    }
    const shortcut = shortcuts.get(key);
    if (shortcut) {
      resetChannel();
      if (!repeat && shortcut.pathname !== location.pathname) void navigate(shortcut.href);
      return true;
    }
    return false;
  }

  launcher.addEventListener("click", () => setView(true), { signal });
  exit.addEventListener("click", event => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setView(false);
  }, { signal });

  controls.addEventListener("click", event => {
    if (!active() || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const key = event.target instanceof Element ? event.target.closest<HTMLElement>(keySelector)?.dataset.teletextKey : undefined;
    if (!key) return;
    event.preventDefault();
    useKey(key, false);
  }, { signal });

  document.addEventListener("pointerdown", event => {
    if (!active() || event.pointerType === "mouse" || !event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
    const key = event.target.closest<HTMLElement>(pressableSelector);
    if (!key) return;
    releaseTouch();
    pressed = { key, pointerId: event.pointerId };
    key.setAttribute("data-teletext-pressed", "");
  }, { signal });
  document.addEventListener("pointerup", event => releaseTouch(event.pointerId), { signal });
  document.addEventListener("pointercancel", event => releaseTouch(event.pointerId), { signal });
  window.addEventListener("blur", () => releaseTouch(), { signal });

  document.addEventListener("focusin", event => {
    if (active() && event.target instanceof HTMLAnchorElement && event.target.matches(entrySelector)) highlight(event.target);
  }, { signal });

  document.addEventListener("keydown", event => {
    if (!active() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof Element) {
      if (event.key === "Enter" && target.closest(keySelector)) return;
      if (event.key !== "Escape" && target.closest("input, textarea, select, [contenteditable]")) return;
    }
    if (useKey(event.key, true, event.repeat)) event.preventDefault();
  }, { capture: true, signal });
  signal.addEventListener("abort", () => {
    clearTimeout(timeout);
    releaseTouch();
  }, { once: true });
}
