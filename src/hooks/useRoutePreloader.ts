import { useCallback } from 'react';

// Route-to-module map for intelligent prefetching
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

const prefetched = new Set<string>();

export function useRoutePreloader() {
  const prefetchRoute = useCallback((path: string) => {
    if (prefetched.has(path) || !routeModules[path]) return;
    prefetched.add(path);
    // Use requestIdleCallback for non-blocking prefetch
    const cb = () => routeModules[path]().catch(() => prefetched.delete(path));
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(cb, { timeout: 3000 });
    } else {
      setTimeout(cb, 100);
    }
  }, []);

  return { prefetchRoute };
}
