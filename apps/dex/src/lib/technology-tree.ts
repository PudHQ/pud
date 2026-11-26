interface Technology { id: string; x: number; y: number }
interface Layout { width: number; height: number; nodes: Technology[] }

function mount(root: HTMLElement) {
  const layout = JSON.parse(root.dataset.layout!) as Layout;
  const viewport = root.querySelector<HTMLElement>("[data-viewport]")!;
  const spacer = root.querySelector<HTMLElement>("[data-spacer]")!;
  const world = root.querySelector<HTMLElement>("[data-world]")!;
  const picker = root.querySelector<HTMLSelectElement>("#atlas-area")!;
  const plus = root.querySelector<HTMLButtonElement>("[data-zoom-in]")!;
  const minus = root.querySelector<HTMLButtonElement>("[data-zoom-out]")!;
  const output = root.querySelector<HTMLOutputElement>("[data-zoom]")!;
  const fullscreen = root.querySelector<HTMLButtonElement>("[data-fullscreen]")!;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-tech]")];
  const details = root.querySelector<HTMLElement>("#atlas-details")!;
  const toggleDetails = root.querySelector<HTMLButtonElement>("[data-details-toggle]")!;
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  let selected = "projects", zoom = 1, fitted = true;
  let expanded = false;

  function showDetails(visible: boolean) {
    details.hidden = !visible;
    toggleDetails.setAttribute("aria-expanded", String(visible));
  }

  function expandMap(active: boolean) {
    expanded = active;
    const label = active ? "Exit expanded map" : "Expand map";
    fullscreen.title = label;
    fullscreen.setAttribute("aria-label", label);
    fullscreen.setAttribute("aria-pressed", String(active));
    toggleDetails.hidden = !active;
    showDetails(!active);
  }

  function size(scale: number) {
    zoom = scale;
    world.style.transform = "scale(" + zoom + ")";
    spacer.style.width = layout.width * zoom + "px";
    spacer.style.height = layout.height * zoom + "px";
    output.value = Math.round(zoom * 100) + "%";
    minus.disabled = zoom <= .3;
    plus.disabled = zoom >= 1.8;
  }
  function fit() {
    fitted = true;
    size(Math.min((viewport.clientWidth - 4) / layout.width, (viewport.clientHeight - 4) / layout.height, 1.2));
    viewport.scrollTo(0, 0);
  }
  function changeZoom(delta: number) {
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2 - spacer.offsetLeft) / zoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    fitted = false;
    size(Math.max(.3, Math.min(1.8, Math.round((zoom + delta) * 100) / 100)));
    viewport.scrollTo(spacer.offsetLeft + centerX * zoom - viewport.clientWidth / 2, centerY * zoom - viewport.clientHeight / 2);
  }
  function select(id: string, reveal = false, focus = false, writeHash = true) {
    if (!byId.has(id)) return;
    selected = id;
    picker.value = id;
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.tech === id));
    for (const panel of details.querySelectorAll<HTMLElement>("[data-description]")) panel.hidden = panel.dataset.description !== id;
    if (expanded) showDetails(true);
    details.scrollTop = 0;
    for (const edge of world.querySelectorAll<SVGGElement>("[data-parent]")) {
      edge.dataset.relation = edge.dataset.child === id ? "before" : edge.dataset.parent === id ? "after" : "";
    }
    if (writeHash && location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    const button = buttons.find(b => b.dataset.tech === id)!;
    if (reveal) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" });
    if (focus) button.focus({ preventScroll: true });
  }
  root.addEventListener("click", event => {
    const target = (event.target as Element).closest<HTMLElement>("[data-tech],[data-jump]");
    if (target?.dataset.tech) select(target.dataset.tech);
    if (target?.dataset.jump) { event.preventDefault(); select(target.dataset.jump, true, true); }
  });
  picker.addEventListener("change", () => select(picker.value, true));
  viewport.addEventListener("keydown", event => {
    const current = byId.get((event.target as HTMLElement).closest<HTMLElement>("[data-tech]")?.dataset.tech ?? selected)!;
    const direction: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const vector = direction[event.key];
    if (!vector) return;
    event.preventDefault();
    const [dx, dy] = vector;
    const candidates = layout.nodes.filter(n => (n.x - current.x) * dx + (n.y - current.y) * dy > 0);
    const distance = (n: Technology) => Math.hypot(n.x - current.x, n.y - current.y) + 2 * Math.abs((n.x - current.x) * dy - (n.y - current.y) * dx);
    const next = candidates.sort((a, b) => distance(a) - distance(b))[0];
    if (next) select(next.id, true, true);
  });
  // Touch uses the browser's native two-axis scrolling and pinch gestures.
  let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
  viewport.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest("button")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    viewport.style.cursor = "grabbing";
  });
  viewport.addEventListener("pointermove", event => {
    if (drag?.id === event.pointerId) viewport.scrollTo(drag.left + drag.x - event.clientX, drag.top + drag.y - event.clientY);
  });
  viewport.addEventListener("lostpointercapture", () => { drag = undefined; viewport.style.cursor = ""; });
  plus.addEventListener("click", () => changeZoom(.2));
  minus.addEventListener("click", () => changeZoom(-.2));
  root.querySelector("[data-fit]")!.addEventListener("click", fit);
  toggleDetails.addEventListener("click", () => showDetails(details.hasAttribute("hidden")));
  fullscreen.addEventListener("click", async () => {
    if (expanded) {
      expandMap(false);
      if (document.fullscreenElement === root) await document.exitFullscreen();
      return;
    }
    expandMap(true);
    if (document.fullscreenEnabled) {
      try { await root.requestFullscreen(); }
      // Embedded browsers can decline native fullscreen. The expanded window layout stays usable.
      catch { fullscreen.title = "Restore window layout"; }
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) expandMap(false);
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && expanded && !document.fullscreenElement) {
      expandMap(false);
      fullscreen.focus({ preventScroll: true });
    }
  });
  new ResizeObserver(() => { if (fitted) fit(); }).observe(viewport);
  window.addEventListener("hashchange", () => select(location.hash.slice(1), true, false, false));
  const narrow = viewport.clientWidth < 760;
  if (narrow) { fitted = false; size(.9); } else fit();
  select(byId.has(location.hash.slice(1)) ? location.hash.slice(1) : selected, narrow || !!location.hash, false, false);
}

const atlas = document.querySelector<HTMLElement>("[data-tech-atlas]");
if (atlas) mount(atlas);
