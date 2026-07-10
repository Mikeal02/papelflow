import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useRoutePreloader } from "@/hooks/useRoutePreloader";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  /** Disable predictive prefetching for a specific link. */
  noPrefetch?: boolean;
}

/**
 * NavLink with predictive prefetching.
 *
 * We warm the target route's JS chunk on the earliest reliable signal of
 * navigation intent — pointer enter, focus, or pointer down — using the
 * network-aware `useRoutePreloader`. That turns most in-app navigations into
 * cache-hit renders with zero perceptible chunk load.
 *
 * A per-instance ref guards against re-triggering the loader on every
 * mouseover, so rapid pointer movement across the sidebar stays free.
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      to,
      noPrefetch,
      onPointerEnter,
      onFocus,
      onPointerDown,
      ...props
    },
    ref,
  ) => {
    const { prefetchRoute } = useRoutePreloader();
    const warmedRef = useRef(false);

    const warm = useCallback(() => {
      if (noPrefetch || warmedRef.current) return;
      const path = typeof to === "string" ? to : to?.pathname;
      if (!path) return;
      warmedRef.current = true;
      prefetchRoute(path);
    }, [noPrefetch, prefetchRoute, to]);

    return (
      <RouterNavLink
        ref={ref}
        to={to}
        onPointerEnter={(e) => { warm(); onPointerEnter?.(e); }}
        onFocus={(e) => { warm(); onFocus?.(e); }}
        onPointerDown={(e) => { warm(); onPointerDown?.(e); }}
        className={({ isActive, isPending }) =>
          cn(className, isActive && activeClassName, isPending && pendingClassName)
        }
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
