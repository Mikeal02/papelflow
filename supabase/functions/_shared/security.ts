// Shared security helpers for edge functions.
// - requireAuth(): verifies the caller's Supabase JWT and returns the user.
// - escapeHtml(): escapes strings before interpolation into HTML.
// - json(): consistent JSON response with CORS.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
export async function requireAuth(req: Request): Promise<AuthedUser | Response> {
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
  if (error || !claims?.sub) return json({ error: "unauthorized" }, 401);
  if (claims.is_anonymous === true) return json({ error: "forbidden" }, 403);

  return { id: String(claims.sub), email: (claims.email ?? null) as string | null, client };
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
