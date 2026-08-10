// Lazily-created service-role client for trusted server-side writes only.
//
// Never returned to, or derived from, client input. Used exclusively for
// deny-all tables (rate_limit_counters) and append-only logs (security_events)
// that intentionally have no INSERT policy.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

let cached: SupabaseClient | null = null;

export function adminClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

/** First hop of the forwarded chain — the only value a proxy cannot let the client forge. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return (
    fwd.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

/**
 * Salted SHA-256 of an IP. We log a stable pseudonym so abuse can be
 * correlated across requests without persisting raw network identifiers.
 */
export async function hashIp(ip: string): Promise<string | null> {
  if (!ip) return null;
  const salt = Deno.env.get("PLAID_TOKEN_SEAL_KEY") ?? "finflow-static-salt";
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${ip}`) as BufferSource,
  );
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex.slice(0, 48);
}

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  userId?: string | null;
  kind: string;
  severity?: Severity;
  source?: string;
  detail?: Record<string, unknown>;
  req?: Request;
}

/**
 * Append a row to the tamper-evident security log. Fire-and-forget: telemetry
 * must never change the outcome of a request, so all failures are swallowed.
 */
export async function recordSecurityEvent(ev: SecurityEvent): Promise<void> {
  try {
    const admin = adminClient();
    if (!admin) return;
    const ip_hash = ev.req ? await hashIp(clientIp(ev.req)) : null;
    await admin.rpc("record_security_event", {
      p_user_id: ev.userId ?? null,
      p_kind: ev.kind,
      p_severity: ev.severity ?? "info",
      p_source: ev.source ?? null,
      p_detail: ev.detail ?? {},
      p_ip_hash: ip_hash,
    });
  } catch {
    /* never break the request path on audit failure */
  }
}
