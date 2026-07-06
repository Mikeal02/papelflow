import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

const PLAID_ENV = Deno.env.get("PLAID_ENV") || "sandbox";
const PLAID_BASE_URL =
  PLAID_ENV === "production" ? "https://production.plaid.com"
  : PLAID_ENV === "development" ? "https://development.plaid.com"
  : "https://sandbox.plaid.com";

const ALLOWED_ACTIONS = new Set([
  "create_link_token",
  "exchange_public_token",
  "get_accounts",
  "get_transactions",
  "get_institution",
]);

// String guards keep provider payloads well-formed and prevent oversized abuse.
const isStr = (v: unknown, min = 1, max = 512): v is string =>
  typeof v === "string" && v.length >= min && v.length <= max;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Every Plaid call is user-scoped — auth is mandatory. The Plaid user id
  // is derived from the JWT, so callers cannot impersonate another account.
  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;

  const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
  const PLAID_SECRET = Deno.env.get("PLAID_SECRET");
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return json({ error: "Plaid credentials not configured", needsSetup: true }, 400);
  }

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const { action, ...params } = payload ?? {};
  if (!ALLOWED_ACTIONS.has(action)) return json({ error: "unknown_action" }, 400);

  const callPlaid = async (path: string, body: Record<string, unknown>) => {
    const r = await fetch(`${PLAID_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, ...body }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, data };
  };

  try {
    if (action === "create_link_token") {
      const { ok, data } = await callPlaid("/link/token/create", {
        // Hard-bind the Plaid user id to the JWT sub — clients cannot pass their own.
        user: { client_user_id: authed.id },
        client_name: "Finflow",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      });
      if (!ok) { console.error("Plaid create_link_token error:", data); return json({ error: data?.error_message || "Failed to create link token" }, 400); }
      return json({ link_token: data.link_token });
    }

    if (action === "exchange_public_token") {
      if (!isStr(params.public_token)) return json({ error: "invalid_public_token" }, 400);
      const { ok, data } = await callPlaid("/item/public_token/exchange", { public_token: params.public_token });
      if (!ok) { console.error("Plaid exchange error:", data); return json({ error: data?.error_message || "Failed to exchange token" }, 400); }
      return json({ access_token: data.access_token, item_id: data.item_id });
    }

    if (action === "get_accounts") {
      if (!isStr(params.access_token)) return json({ error: "invalid_access_token" }, 400);
      const { ok, data } = await callPlaid("/accounts/get", { access_token: params.access_token });
      if (!ok) { console.error("Plaid get_accounts error:", data); return json({ error: data?.error_message || "Failed to get accounts" }, 400); }
      return json({ accounts: data.accounts });
    }

    if (action === "get_transactions") {
      if (!isStr(params.access_token)) return json({ error: "invalid_access_token" }, 400);
      const cursor = typeof params.cursor === "string" && params.cursor.length <= 2048 ? params.cursor : "";
      const { ok, data } = await callPlaid("/transactions/sync", { access_token: params.access_token, cursor });
      if (!ok) { console.error("Plaid get_transactions error:", data); return json({ error: data?.error_message || "Failed to get transactions" }, 400); }
      return json({ added: data.added, modified: data.modified, removed: data.removed, next_cursor: data.next_cursor, has_more: data.has_more });
    }

    if (action === "get_institution") {
      if (!isStr(params.institution_id, 1, 128)) return json({ error: "invalid_institution_id" }, 400);
      const { ok, data } = await callPlaid("/institutions/get_by_id", { institution_id: params.institution_id, country_codes: ["US"] });
      if (!ok) return json({ error: data?.error_message || "Failed to get institution" }, 400);
      return json({ institution: data.institution });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error("Plaid function error:", error);
    return json({ error: "internal_error" }, 500);
  }
});
