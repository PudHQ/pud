export function mountRouteElement<T extends Element>(selector: string, mount: (element: T, signal: AbortSignal) => void) {
  let mounted: T | null = null;
  let lifetime: AbortController | undefined;

  function update() {
    const element = document.querySelector<T>(selector);
    if (element === mounted) return;
    lifetime?.abort();
    mounted = element;
    lifetime = undefined;
    if (element) {
      lifetime = new AbortController();
      mount(element, lifetime.signal);
    }
  }

  update();
  document.addEventListener("astro:after-swap", update);
}
