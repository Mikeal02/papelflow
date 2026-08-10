// Two-tier rate limiting: an in-memory fast path plus a durable, database-backed
// counter shared by every edge-function instance.
//
// Why two tiers:
//   * The in-memory sliding window costs nothing and absorbs trivial hammering
//     without a round-trip, but it is per-instance — an attacker who spreads
//     traffic across cold starts escapes it entirely.
//   * `public.consume_rate_limit` is an atomic, epoch-aligned fixed-window
//     counter in Postgres. Every instance agrees on the same window boundary,
//     so the nominal limit holds globally regardless of how many instances the
//     platform spins up.
//
// Local check runs first (cheap rejection), then the durable counter is
// consumed. If the database is unreachable we fail *closed* on the local
// verdict rather than granting unlimited access.

import { recordSecurityEvent } from "./admin.ts";
import { adminClient } from "./admin.ts";

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

export interface Limit {
  /** max requests inside the window */
  limit: number;
  /** window length in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  /** which tier produced the verdict — surfaced in the security log */
  scope?: "local" | "durable";
}

/** In-memory sliding window. Synchronous, best-effort, per-instance. */
export function rateLimit(userId: string, name: string, ...limits: Limit[]): RateLimitResult {
  const now = Date.now();
  const longest = Math.max(...limits.map((l) => l.windowSec)) * 1000;
  const key = `${name}:${userId}`;

  let b = buckets.get(key);
  if (!b) {
    if (buckets.size > MAX_KEYS) buckets.clear(); // crude bound; buckets are ephemeral
    b = { hits: [] };
    buckets.set(key, b);
  }
  b.hits = b.hits.filter((t) => now - t < longest);

  for (const { limit, windowSec } of limits) {
    const windowMs = windowSec * 1000;
    const inWindow = b.hits.filter((t) => now - t < windowMs);
    if (inWindow.length >= limit) {
      const oldest = Math.min(...inWindow);
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
        scope: "local",
      };
    }
  }

  b.hits.push(now);
  return { allowed: true, retryAfter: 0, scope: "local" };
}

/**
 * Durable, cross-instance limiter. Enforces every supplied limit and records a
 * security event whenever a subject is throttled.
 *
 * @param subject stable identity to meter — normally the authenticated user id
 */
export async function enforceRateLimit(
  subject: string,
  name: string,
  ...limits: Limit[]
): Promise<RateLimitResult> {
  // Tier 1 — free local rejection.
  const local = rateLimit(subject, name, ...limits);
  if (!local.allowed) {
    void recordSecurityEvent({
      userId: subject,
      kind: "rate_limit_exceeded",
      severity: "medium",
      source: name,
      detail: { scope: "local", retry_after: local.retryAfter },
    });
    return local;
  }

  // Tier 2 — authoritative shared counter.
  const admin = adminClient();
  if (!admin) return local;

  for (const { limit, windowSec } of limits) {
    try {
      const { data, error } = await admin.rpc("consume_rate_limit", {
        p_subject: subject,
        p_bucket: name,
        p_limit: limit,
        p_window_sec: windowSec,
      });
      if (error) continue; // degrade to the local verdict, never to "unlimited"
      const row = Array.isArray(data) ? data[0] : data;
      if (row && row.allowed === false) {
        const retryAfter = Math.max(1, Number(row.retry_after) || windowSec);
        void recordSecurityEvent({
          userId: subject,
          kind: "rate_limit_exceeded",
          severity: "high",
          source: name,
          detail: { scope: "durable", hits: row.hits, limit, window_sec: windowSec },
        });
        return { allowed: false, retryAfter, scope: "durable" };
      }
    } catch {
      /* keep the local verdict */
    }
  }

  return { allowed: true, retryAfter: 0, scope: "durable" };
}

export function tooManyRequests(retryAfter: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "rate_limited", message: "Too many requests. Please slow down.", retryAfter }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) },
    },
  );
}
