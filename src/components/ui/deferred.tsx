import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Viewport-gated lazy boundary.
 *
 * The dashboard and analytics pages each mount 20+ code-split widgets, several
 * of which run heavy math on mount (Monte Carlo simulations, anomaly ensembles,
 * merchant graphs). Wrapping them all in a bare `<Suspense>` still requests
 * every chunk and runs every computation during the first paint, because
 * `React.lazy` resolves as soon as the element is rendered.
 *
 * `<Deferred>` holds a placeholder of the same height until the widget is near
 * the viewport, so chunk fetches and first render cost are spread across the
 * scroll instead of colliding on load. Once revealed it never un-mounts, so
 * scrolling back up is instant and widget state survives.
 */
interface DeferredProps {
  children: ReactNode;
  /** Rendered before reveal and while the lazy chunk resolves. */
  fallback?: ReactNode;
  /** How far outside the viewport to start loading. */
  rootMargin?: string;
  /** Reveal immediately, skipping the observer (for above-the-fold widgets). */
  eager?: boolean;
  className?: string;
}

export function Deferred({
  children,
  fallback = null,
  rootMargin = "320px",
  eager = false,
  className,
}: DeferredProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;

    // Environments without IntersectionObserver (or SSR snapshots) render eagerly.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {visible ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}
    </div>
  );
}

/** Neutral, layout-stable placeholder sized to the widget it replaces. */
export function WidgetPlaceholder({ height = "h-48" }: { height?: string }) {
  return (
    <div
      className={`rounded-xl border border-border/30 bg-card/60 animate-pulse ${height}`}
      aria-hidden="true"
    />
  );
}
