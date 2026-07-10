import { useCallback, useEffect } from 'react';

/**
 * Elite route prefetcher.
 *
 * - Each route is mapped to its lazy import so we can warm the JS chunk on
 *   hover, focus, or during browser idle time.
 * - Prefetches are gated on Save-Data + effective connection type: we never
 *   ship megabytes to a phone on 2G or with Data Saver on.
 * - Priority tiers stagger the idle warm-up so the critical dashboard chunk
 *   lands first, then transactional pages, then the long tail.
 */

const routeModules: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Index'),
  '/transactions': () => import('../pages/Transactions'),
  '/accounts': () => import('../pages/Accounts'),
  '/budgets': () => import('../pages/Budgets'),
  '/reports': () => import('../pages/Reports'),
  '/subscriptions': () => import('../pages/Subscriptions'),
  '/goals': () => import('../pages/Goals'),
  '/net-worth': () => import('../pages/NetWorth'),
  '/settings': () => import('../pages/Settings'),
  '/categories': () => import('../pages/Categories'),
  '/debt': () => import('../pages/DebtTracker'),
  '/tax': () => import('../pages/TaxEstimator'),
  '/investments': () => import('../pages/Investments'),
  '/recurring': () => import('../pages/RecurringPayments'),
  '/challenges': () => import('../pages/Challenges'),
  '/analytics': () => import('../pages/Analytics'),
};

// Ordered by user-journey likelihood after auth.
const CRITICAL_ROUTES = ['/', '/transactions', '/accounts', '/budgets'];
const SECONDARY_ROUTES = ['/reports', '/analytics', '/goals', '/net-worth'];

const prefetched = new Set<string>();
const inflight = new Map<string, Promise<unknown>>();

interface NetInfo { saveData?: boolean; effectiveType?: string }
function connectionAllowsPrefetch(): boolean {
  if (typeof navigator === 'undefined') return true;
  const c = (navigator as unknown as { connection?: NetInfo }).connection;
  if (!c) return true;
  if (c.saveData) return false;
  if (c.effectiveType && /(^|-)(2g|slow-2g)$/i.test(c.effectiveType)) return false;
  return true;
}

function schedule(cb: () => void, timeout = 2000) {
  if (typeof window === 'undefined') return;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (ric) ric(cb, { timeout });
  else setTimeout(cb, 120);
}

function warm(path: string): Promise<unknown> | undefined {
  const loader = routeModules[path];
  if (!loader) return;
  if (prefetched.has(path)) return;
  const existing = inflight.get(path);
  if (existing) return existing;
  const p = loader()
    .then((mod) => { prefetched.add(path); return mod; })
    .catch(() => { /* swallow — best-effort */ })
    .finally(() => { inflight.delete(path); });
  inflight.set(path, p);
  return p;
}

export function useRoutePreloader() {
  const prefetchRoute = useCallback((path: string) => {
    if (!connectionAllowsPrefetch()) return;
    schedule(() => { warm(path); }, 3000);
  }, []);

  return { prefetchRoute };
}

/**
 * Fire once from an authenticated shell to pre-warm the most likely next
 * navigations. Safe to call multiple times — dedup + inflight guard.
 */
export function useCriticalRoutePrewarm(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !connectionAllowsPrefetch()) return;
    let cancelled = false;

    // Tier 1 immediately when the browser is idle.
    schedule(() => {
      if (cancelled) return;
      CRITICAL_ROUTES.forEach(warm);
    }, 1500);

    // Tier 2 after the first tier has had a chance to land.
    const t = window.setTimeout(() => {
      if (cancelled) return;
      schedule(() => SECONDARY_ROUTES.forEach(warm), 4000);
    }, 1500);

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [enabled]);
}
