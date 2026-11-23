import { crtFrameName, crtWarpScale, rasterDisplacement, sampleRaster } from "@pud/crt";

const controls = "a[href], button, input, label, select, summary, textarea";

function clickThroughLens(viewport: HTMLElement, event: MouseEvent) {
  if (!(event.target instanceof Element) || event.detail === 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const { left, top, width, height } = viewport.getBoundingClientRect();
  const x = (event.clientX - left) / width * 2 - 1;
  const y = (event.clientY - top) / height * 2 - 1;
  const [u, v] = sampleRaster(x, y);
  const physical = event.target.closest(controls);
  const painted = document.elementFromPoint(left + (u + 1) * width / 2, top + (v + 1) * height / 2)?.closest(controls) ?? null;
  if (physical === painted) return;

  // A paint filter moves pixels but leaves the browser's original hit boxes in place.
  event.preventDefault();
  event.stopImmediatePropagation();
  if (painted instanceof HTMLElement && !painted.matches(":disabled, [aria-disabled=true]")) {
    painted.focus({ preventScroll: true });
    painted.click();
  }
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
  let observer: ResizeObserver | undefined;
  let viewport: HTMLElement | undefined;

  function fitDisplay() {
    observer?.disconnect();
    const view = document.querySelector<HTMLElement>("[data-crt-viewport]");
    const filter = document.querySelector("#dex-crt-lens");
    const raster = filter?.querySelector("feImage");
    const displacement = filter?.querySelector("feDisplacementMap");
    viewport = view ?? undefined;
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
