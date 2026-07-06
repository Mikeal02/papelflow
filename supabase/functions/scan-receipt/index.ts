import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

// Cap uploads to protect the AI gateway budget and prevent memory abuse.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB of base64 payload
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|heic|heif);base64,[A-Za-z0-9+/=]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "ai_service_unavailable" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const imageBase64 = body?.imageBase64;
  if (typeof imageBase64 !== "string") return json({ error: "no_image_provided" }, 400);
  if (imageBase64.length > MAX_IMAGE_BYTES) return json({ error: "image_too_large" }, 413);
  if (!DATA_URL_RE.test(imageBase64)) return json({ error: "invalid_image_format" }, 400);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Analyze this receipt image and extract information as JSON:
{
  "merchant": "store or merchant name",
  "date": "YYYY-MM-DD or null",
  "total": <number>,
  "items": [{ "name": "item", "amount": <number> }],
  "category": "one of: Food & Dining, Groceries, Shopping, Transportation, Entertainment, Healthcare, Utilities, Other",
  "confidence": "high" | "medium" | "low"
}
Return ONLY valid JSON, no other text.` },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) return json({ error: "Rate limit exceeded. Please try again." }, 429);
    if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    return json({ error: "Failed to analyze receipt" }, 502);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  let receiptData: unknown;
  try {
    receiptData = JSON.parse(content);
  } catch {
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) receiptData = JSON.parse(fence[1].trim());
    else {
      const obj = content.match(/\{[\s\S]*\}/);
      if (obj) receiptData = JSON.parse(obj[0]);
      else return json({ error: "Could not parse receipt data" }, 502);
    }
  }
  return json({ success: true, data: receiptData });
});
