// Records a login/logout/security event for the authenticated user.
// Captures IP + UA server-side so the client cannot forge geolocation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

interface Body {
  event_type: "sign_in" | "sign_out" | "token_refresh" | "password_change" | "failed_attempt";
  session_id?: string;
}

function parseUA(ua: string) {
  const s = ua.toLowerCase();
  let device = "Desktop";
  if (/mobile|iphone|android.*mobile/.test(s)) device = "Mobile";
  else if (/ipad|tablet/.test(s)) device = "Tablet";

  let browser = "Unknown";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/chrome\//.test(s) && !/edg\//.test(s)) browser = "Chrome";
  else if (/firefox\//.test(s)) browser = "Firefox";
  else if (/safari\//.test(s) && !/chrome/.test(s)) browser = "Safari";
  else if (/opr\/|opera/.test(s)) browser = "Opera";

  let os = "Unknown";
  if (/windows/.test(s)) os = "Windows";
  else if (/mac os|macintosh/.test(s)) os = "macOS";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (/android/.test(s)) os = "Android";
  else if (/linux/.test(s)) os = "Linux";

  return { device, browser, os };
}

async function geolocate(ip: string) {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::")) return {};
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return {};
    const j = await r.json();
    return { city: j.city ?? null, region: j.region ?? null, country: j.country_name ?? null };
  } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const allowed = ["sign_in", "sign_out", "token_refresh", "password_change", "failed_attempt"];
  if (!allowed.includes(body.event_type)) return json({ error: "invalid_event_type" }, 400);

  const ua = req.headers.get("user-agent") ?? "";
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "";
  const { device, browser, os } = parseUA(ua);
  const geo = await geolocate(ip);

  // Suspicion heuristic: new country vs last recorded event.
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: prev } = await admin
    .from("login_events")
    .select("country")
    .eq("user_id", auth.id)
    .eq("event_type", "sign_in")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const is_suspicious = !!(geo.country && prev?.country && geo.country !== prev.country);

  const { error } = await admin.from("login_events").insert({
    user_id: auth.id,
    event_type: body.event_type,
    ip_address: ip || null,
    user_agent: ua || null,
    device, browser, os,
    ...geo,
    session_id: body.session_id ?? null,
    is_suspicious,
  });
  if (error) return json({ error: "insert_failed", detail: error.message }, 500);

  return json({ ok: true, is_suspicious });
});
