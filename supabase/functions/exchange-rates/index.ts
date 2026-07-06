import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

const API_URL = "https://api.exchangerate-api.com/v4/latest";
const CURRENCY_RE = /^[A-Z]{3}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Require auth so anonymous clients cannot burn our upstream quota.
  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;

  let body: any = {};
  try { body = await req.json(); } catch { /* body optional */ }
  const raw = (body?.base ?? "USD").toString().toUpperCase();
  const base = CURRENCY_RE.test(raw) ? raw : "USD";

  try {
    const response = await fetch(`${API_URL}/${base}`);
    if (!response.ok) return json({ error: `Exchange rate API failed [${response.status}]` }, 502);
    const data = await response.json();
    return json({ base: data.base, rates: data.rates, timestamp: data.time_last_updated });
  } catch (error) {
    console.error("Exchange rate error:", error);
    return json({ error: "upstream_failure" }, 502);
  }
});
