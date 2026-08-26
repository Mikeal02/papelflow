/**
 * Single source of truth for React Query cache keys and invalidation.
 *
 * Why this exists
 * ---------------
 * Cache keys were previously inline string literals duplicated across ~12
 * hooks, and every mutation hand-listed the domains it thought it affected.
 * That drifts: `goals` mutations never refreshed aggregations, `transactions`
 * mutations never refreshed goals/intelligence, and a couple of call sites
 * resorted to `qc.invalidateQueries()` — nuking every cache in the app,
 * including exchange rates that cost a network round-trip.
 *
 * Here, each cache is a named *domain* with one canonical key factory plus a
 * declared dependency edge set. `invalidateDomains` walks the closure of those
 * edges, so a caller states only what it changed ("transactions") and every
 * derived cache is refreshed exactly once — no more, no less.
 */

export type Domain =
  | "transactions"
  | "accounts"
  | "categories"
  | "budgets"
  | "goals"
  | "subscriptions"
  | "profile"
  | "monthlyStats"
  | "aggregations"
  | "intelligenceAlerts"
  | "exchangeRates"
  | "pipeline";

/** Root prefix for every domain. Prefix-matching covers all per-user variants. */
const ROOT: Record<Domain, readonly [string]> = {
  transactions: ["transactions"],
  accounts: ["accounts"],
  categories: ["categories"],
  budgets: ["budgets"],
  goals: ["goals"],
  subscriptions: ["subscriptions"],
  profile: ["profile"],
  monthlyStats: ["monthly-stats"],
  aggregations: ["aggregations"],
  intelligenceAlerts: ["intelligence-alerts"],
  exchangeRates: ["exchange-rates"],
  pipeline: ["pipeline"],
};

/**
 * Derived caches that must be refreshed when a domain changes.
 * Edges are transitive — declare only direct consumers.
 */
const DEPENDENTS: Record<Domain, readonly Domain[]> = {
  transactions: [
    "monthlyStats",
    "budgets",
    "accounts",
    "aggregations",
    "intelligenceAlerts",
  ],
  accounts: ["transactions", "monthlyStats", "aggregations"],
  categories: ["transactions", "budgets"],
  budgets: ["monthlyStats"],
  goals: ["aggregations"],
  subscriptions: ["accounts", "aggregations"],
  profile: ["exchangeRates"],
  monthlyStats: [],
  aggregations: [],
  intelligenceAlerts: [],
  exchangeRates: [],
  pipeline: [],
};

/** Canonical key factories. Always build keys through these. */
export const qk = {
  transactions: (userId?: string, limit?: number) =>
    ["transactions", userId, limit] as const,
  accounts: (userId?: string) => ["accounts", userId] as const,
  categories: (userId?: string) => ["categories", userId] as const,
  budgets: (userId?: string, month?: string) =>
    ["budgets", userId, month] as const,
  goals: (userId?: string) => ["goals", userId] as const,
  subscriptions: (userId?: string) => ["subscriptions", userId] as const,
  profile: (userId?: string) => ["profile", userId] as const,
  monthlyStats: (userId?: string, month?: string) =>
    ["monthly-stats", userId, month] as const,
  aggregations: (userId?: string, scope?: string) =>
    ["aggregations", userId, scope] as const,
  intelligenceAlerts: (userId?: string) =>
    ["intelligence-alerts", userId] as const,
  exchangeRates: (base: string) => ["exchange-rates", base] as const,
  pipeline: (table?: string) => ["pipeline", table] as const,
} as const;

/** Expand a set of changed domains into the full set of affected domains. */
export function affectedDomains(changed: readonly Domain[]): Domain[] {
  const seen = new Set<Domain>();
  const stack = [...changed];
  while (stack.length) {
    const d = stack.pop()!;
    if (seen.has(d)) continue;
    seen.add(d);
    for (const next of DEPENDENTS[d]) if (!seen.has(next)) stack.push(next);
  }
  return [...seen];
}

interface Invalidator {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => unknown;
}

/**
 * Invalidate the transitive closure of caches affected by `changed`.
 * Replaces long hand-written invalidation lists and blanket cache wipes.
 */
export function invalidateDomains(
  client: Invalidator,
  ...changed: Domain[]
): void {
  for (const domain of affectedDomains(changed)) {
    client.invalidateQueries({ queryKey: ROOT[domain] });
  }
}

/** Every user-scoped domain — use on sign-out or a full manual resync. */
export const ALL_DOMAINS: readonly Domain[] = Object.keys(ROOT) as Domain[];
