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
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    let inView = !window.IntersectionObserver;
    const update = () => setVisible(inView && !document.hidden);
    const preload = window.IntersectionObserver && new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setMounted(true);
        preload?.disconnect();
      }
    }, { rootMargin: "180px" });
    const observer = window.IntersectionObserver && new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (preload && observer) {
      preload.observe(element);
      observer.observe(element);
    } else {
      setMounted(true);
      update();
    }
    document.addEventListener("visibilitychange", update);
    return () => {
      preload?.disconnect();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div ref={viewport} className="absolute inset-0" aria-hidden="true">
      {mounted ? (
        <SceneBoundary artwork={artwork}>
          <Suspense fallback={artwork}>{children(visible && !reduced)}</Suspense>
        </SceneBoundary>
      ) : artwork}
    </div>
  );
}
