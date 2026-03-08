import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAID_ENV = Deno.env.get("PLAID_ENV") || "sandbox";
const PLAID_BASE_URL = PLAID_ENV === "production" 
  ? "https://production.plaid.com"
  : PLAID_ENV === "development" 
    ? "https://development.plaid.com"
    : "https://sandbox.plaid.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get("PLAID_CLIENT_ID");
    const PLAID_SECRET = Deno.env.get("PLAID_SECRET");

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: "Plaid credentials not configured",
          needsSetup: true 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();

    // Create Link Token (for initializing Plaid Link)
    if (action === "create_link_token") {
      const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          user: { client_user_id: params.user_id },
          client_name: "Finflow",
          products: ["transactions"],
          country_codes: ["US"],
          language: "en",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Plaid create_link_token error:", data);
        return new Response(JSON.stringify({ error: data.error_message || "Failed to create link token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ link_token: data.link_token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange public token for access token
    if (action === "exchange_public_token") {
      const response = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token: params.public_token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Plaid exchange error:", data);
        return new Response(JSON.stringify({ error: data.error_message || "Failed to exchange token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        access_token: data.access_token,
        item_id: data.item_id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get accounts
    if (action === "get_accounts") {
      const response = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: params.access_token,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Plaid get_accounts error:", data);
        return new Response(JSON.stringify({ error: data.error_message || "Failed to get accounts" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ accounts: data.accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get transactions
    if (action === "get_transactions") {
      const response = await fetch(`${PLAID_BASE_URL}/transactions/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token: params.access_token,
          cursor: params.cursor || "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("Plaid get_transactions error:", data);
        return new Response(JSON.stringify({ error: data.error_message || "Failed to get transactions" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        added: data.added,
        modified: data.modified,
        removed: data.removed,
        next_cursor: data.next_cursor,
        has_more: data.has_more,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get institution info
    if (action === "get_institution") {
      const response = await fetch(`${PLAID_BASE_URL}/institutions/get_by_id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          institution_id: params.institution_id,
          country_codes: ["US"],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return new Response(JSON.stringify({ error: data.error_message || "Failed to get institution" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ institution: data.institution }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Plaid function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
