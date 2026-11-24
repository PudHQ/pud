import { bendRaster, crtFrameName, crtWarpScale, rasterDisplacement, sampleRaster } from "@pud/crt";

const controls = "a[href], button, input, label, select, summary, textarea";

function activationTarget(element: Element | null) {
  const control = element?.closest(controls) ?? null;
  // The original label click and the browser's forwarded input click share an action.
  return control instanceof HTMLLabelElement ? control.control ?? control : control;
}

function clickThroughLens(viewport: HTMLElement, event: MouseEvent) {
  if (!(event.target instanceof Element) || event.detail === 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const { left, top, width, height } = viewport.getBoundingClientRect();
  const x = (event.clientX - left) / width * 2 - 1;
  const y = (event.clientY - top) / height * 2 - 1;
  const [u, v] = sampleRaster(x, y);
  const physical = activationTarget(event.target);
  const painted = activationTarget(document.elementFromPoint(left + (u + 1) * width / 2, top + (v + 1) * height / 2));
  if (physical === painted) return;

  // A paint filter moves pixels but leaves the browser's original hit boxes in place.
  event.preventDefault();
  event.stopImmediatePropagation();
  if (painted instanceof HTMLElement && !painted.matches(":disabled, [aria-disabled=true]")) {
    painted.focus({ preventScroll: true });
    painted.click();
  }
}

function mountCrtCursor() {
  const cursor = document.createElement("span");
  cursor.className = "dex-crt-cursor";
  cursor.setAttribute("aria-hidden", "true");
  const root = document.documentElement;
  let viewport: HTMLElement | undefined;
  let point: PointerEvent | undefined;
  let frame = 0;

  function hide() {
    cancelAnimationFrame(frame);
    frame = 0;
    point = undefined;
    root.removeAttribute("data-crt-cursor");
  }

  function paint() {
    frame = 0;
    if (!viewport?.style.filter || !point) return;
    const { clientX, clientY } = point;
    const { left, top, width, height } = viewport.getBoundingClientRect();
    if (!width || !height || clientX < left || clientX >= left + width || clientY < top || clientY >= top + height) {
      hide();
      return;
    }
    const [u, v] = sampleRaster((clientX - left) / width * 2 - 1, (clientY - top) / height * 2 - 1);
    const [x, y] = bendRaster(u, v);
    const [rightX, rightY] = bendRaster(u + 2 / width, v);
    const [downX, downY] = bendRaster(u, v + 2 / height);
    const matrix = [(rightX - x) * width / 2, (rightY - y) * height / 2, (downX - x) * width / 2, (downY - y) * height / 2];
    // Warp the sprite around its click point on its own layer, without repainting the filtered page.
    cursor.style.transform = `translate3d(${clientX}px,${clientY}px,0) matrix(${matrix.join(",")},0,0)`;
    root.toggleAttribute("data-crt-cursor", true);
  }

  document.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") {
      hide();
      return;
    }
    point = event;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  root.addEventListener("pointerleave", hide);
  document.addEventListener("visibilitychange", () => { if (document.hidden) hide(); });
  window.addEventListener("blur", hide);

  return (view: HTMLElement | undefined) => {
    hide();
    viewport = view;
    view?.after(cursor);
  };
}

function fitLens(view: HTMLElement, filter: Element, raster: Element, displacement: Element) {
  const { clientWidth: width, clientHeight: height } = view;
  if (!width || !height) return;
  const map = rasterDisplacement(height / width);
  if (!map) return;
  for (const element of [filter, raster]) {
    element.setAttribute("width", String(width));
    element.setAttribute("height", String(height));
  }
  raster.setAttribute("href", map);
  displacement.setAttribute("scale", String(width * crtWarpScale));
  view.style.filter = "url(#dex-crt-lens)";
}

export function installCrtDisplay() {
  if (window === window.top || window.name !== crtFrameName) return;
  const placeCursor = mountCrtCursor();
  let observer: ResizeObserver | undefined;
  let viewport: HTMLElement | undefined;

  function fitDisplay() {
    observer?.disconnect();
    const view = document.querySelector<HTMLElement>("[data-crt-viewport]");
    const filter = document.querySelector("#dex-crt-lens");
    const raster = filter?.querySelector("feImage");
    const displacement = filter?.querySelector("feDisplacementMap");
    viewport = view ?? undefined;
    placeCursor(viewport);
    if (!view || !filter || !raster || !displacement) return;
    const resize = () => fitLens(view, filter, raster, displacement);
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(view);
  }

  document.documentElement.setAttribute("data-dex-crt", "");
  document.addEventListener("astro:before-swap", ({ newDocument }) => {
    newDocument.documentElement.setAttribute("data-dex-crt", "");
  });
  document.addEventListener("astro:after-swap", fitDisplay);
  document.addEventListener("click", event => {
    if (viewport?.style.filter) clickThroughLens(viewport, event);
  }, { capture: true });
  fitDisplay();
}
