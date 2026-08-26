// Shared security helpers for edge functions.
// - requireAuth(): verifies the caller's Supabase JWT and returns the user.
// - readJson(): size-capped, strictly-typed body parsing.
// - escapeHtml(): escapes strings before interpolation into HTML.
// - json(): consistent JSON response with CORS + hardened response headers.
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { recordSecurityEvent } from "./admin.ts";

export const corsHeaders = {
  // Auth is carried in the Authorization header, never in cookies, so a wildcard
  // origin cannot be leveraged for a credentialed cross-site read.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  // Defence-in-depth: responses are data, never documents.
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

/** Hard ceiling on any request body we are willing to buffer (DoS guard). */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * Parse a JSON body with a declared byte ceiling. Rejects oversized payloads
 * before they are buffered, and never throws — callers get a Response to return.
 */
export async function readJson<T>(
  req: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<T | Response> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return json({ error: "payload_too_large", limit: maxBytes }, 413);
  }
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  if (raw.length > maxBytes)
    return json({ error: "payload_too_large", limit: maxBytes }, 413);
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return json({ error: "bad_json" }, 400);
    }
    return parsed as T;
  } catch {
    return json({ error: "bad_json" }, 400);
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AuthedUser {
  id: string;
  email: string | null;
  client: SupabaseClient;
}

/**
 * Validate the caller's Supabase JWT via getClaims (network-verified) and
 * return the userId + email. Rejects when the token is missing, malformed,
 * expired, or belongs to an anonymous session.
 */
export async function requireAuth(
  req: Request,
): Promise<AuthedUser | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "unauthorized" }, 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return json({ error: "server_misconfigured" }, 500);

  const client = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data, error } = await client.auth.getClaims(token);
  const claims: any = (data as any)?.claims;
  if (error || !claims?.sub) {
    void recordSecurityEvent({
      kind: "auth_rejected",
      severity: "medium",
      source: new URL(req.url).pathname,
      detail: { reason: error ? "invalid_token" : "missing_subject" },
      req,
    });
    return json({ error: "unauthorized" }, 401);
  }
  if (claims.is_anonymous === true) {
    void recordSecurityEvent({
      userId: String(claims.sub),
      kind: "anonymous_session_blocked",
      severity: "high",
      source: new URL(req.url).pathname,
      req,
    });
    return json({ error: "forbidden" }, 403);
  }

  return {
    id: String(claims.sub),
    email: (claims.email ?? null) as string | null,
    client,
  };
}

/** Escape a string for safe interpolation into HTML text/attribute context. */
export function escapeHtml(input: unknown): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Numeric coercion with fallback (never returns NaN). */
export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
