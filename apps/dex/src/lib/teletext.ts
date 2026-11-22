import { navigate } from "astro:transitions/client";

export const teletextAttribute = "data-dex-teletext";
export const teletextChange = "dex:teletext";
const preferenceKey = "puddex:teletext";
let launch: { pathname: string; x: number; y: number } | undefined;

export function mountTeletext(controls: HTMLElement, signal: AbortSignal) {
  const root = document.documentElement;
  const launcher = document.querySelector<HTMLButtonElement>("[data-teletext-launch]")!;
  const exit = document.querySelector<HTMLAnchorElement>("[data-teletext-exit]")!;
  const main = document.getElementById("content")!;
  const channel = controls.querySelector<HTMLElement>("[data-teletext-number]")!;
  const status = controls.querySelector<HTMLElement>("[data-teletext-status]")!;
  const shortcuts: Record<string, HTMLAnchorElement> = {
    ArrowLeft: controls.querySelector<HTMLAnchorElement>("[data-teletext-previous]")!,
    ArrowRight: controls.querySelector<HTMLAnchorElement>("[data-teletext-next]")!,
    i: controls.querySelector<HTMLAnchorElement>("[data-teletext-index]")!,
    l: controls.querySelector<HTMLAnchorElement>("[data-teletext-links]")!,
  };
  const pages: Record<string, string> = JSON.parse(controls.dataset.pages!);
  const pageNumbers = Object.keys(pages);
  const active = () => root.hasAttribute(teletextAttribute);
  let digits = "";
  let timeout = 0;

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

  function selectEntry(direction: number) {
    const entries = [...document.querySelectorAll<HTMLAnchorElement>("[data-teletext-entry]")]
      .filter(entry => entry.getClientRects().length > 0);
    if (!entries.length) return false;
    const index = entries.indexOf(document.activeElement as HTMLAnchorElement);
    const target = index < 0
      ? (direction > 0 ? entries[0] : entries.at(-1)!)
      : entries[Math.max(0, Math.min(index + direction, entries.length - 1))];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  launcher.addEventListener("click", () => setView(true), { signal });
  exit.addEventListener("click", event => {
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    setView(false);
  }, { signal });

  document.addEventListener("wheel", event => {
    if (active() && !event.ctrlKey) event.preventDefault();
  }, { passive: false, signal });
  document.addEventListener("touchmove", event => {
    if (active() && event.touches.length === 1) event.preventDefault();
  }, { passive: false, signal });

  document.addEventListener("keydown", event => {
    if (!active() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setView(false);
      return;
    }
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      if (!event.repeat) {
        digits += event.key;
        updateChannel();
      }
      return;
    }
    if (digits && (event.key === "Backspace" || event.key === "Enter")) {
      event.preventDefault();
      if (event.key === "Enter") tune();
      else {
        digits = digits.slice(0, -1);
        if (digits) updateChannel();
        else resetChannel();
      }
      return;
    }
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    const shortcut = shortcuts[event.key];
    if (shortcut) {
      event.preventDefault();
      resetChannel();
      if (!event.repeat && shortcut.pathname !== location.pathname) void navigate(shortcut.href);
      return;
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && selectEntry(event.key === "ArrowDown" ? 1 : -1)) {
      event.preventDefault();
    }
  }, { capture: true, signal });
  signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
}
