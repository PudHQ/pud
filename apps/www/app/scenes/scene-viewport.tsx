import { Component, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

const motionPreference = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(motionPreference);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeToMotion, () => window.matchMedia(motionPreference).matches, () => true);
}

class SceneBoundary extends Component<{ artwork: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.artwork : this.props.children;
  }
}

export function SceneViewport({ artwork, children }: {
  artwork: ReactNode;
  children: (animate: boolean) => ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    if (!window.IntersectionObserver) {
      setMounted(true);
      setNearby(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setNearby(entry.isIntersecting);
      if (entry.isIntersecting) setMounted(true);
    }, { rootMargin: "180px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={viewport} className="absolute inset-0" aria-hidden="true">
      {mounted ? (
        <SceneBoundary artwork={artwork}>
          <Suspense fallback={artwork}>{children(nearby && !reduced)}</Suspense>
        </SceneBoundary>
      ) : artwork}
    </div>
  );
}
