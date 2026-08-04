// Best-effort per-instance sliding-window rate limiter.
//
// This is defence-in-depth against credit/email abuse from a single compromised
// or scripted account. It is per edge-function instance (not globally
// distributed), so a determined attacker spread across many cold starts can
// exceed the nominal rate — but it makes trivial hammering of the AI gateway,
// Resend, and upstream providers ineffective at near-zero cost.

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
}

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
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
    }
  }

  b.hits.push(now);
  return { allowed: true, retryAfter: 0 };
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
