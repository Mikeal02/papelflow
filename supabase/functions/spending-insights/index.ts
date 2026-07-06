import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

const MAX_PAYLOAD_CHARS = 24_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;

  try {
    const body = await req.json().catch(() => null);
    const spendingData = body?.spendingData;
    if (!spendingData || typeof spendingData !== "object") return json({ error: "invalid_spending_data" }, 400);
    // Bound the size before shipping to the model.
    const serialised = JSON.stringify(spendingData);
    if (serialised.length > MAX_PAYLOAD_CHARS) return json({ error: "payload_too_large" }, 413);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "ai_service_unavailable" }, 503);

    const systemPrompt = `You are an expert personal finance analyst. Analyze the user's spending data and provide actionable insights.

Return a JSON object with this exact structure (no markdown, no code fences, just raw JSON):
{
  "overallScore": <number 1-100>,
  "scoreLabel": "<string: Excellent/Good/Fair/Needs Work/Critical>",
  "topInsight": "<one sentence key finding>",
  "insights": [
    {
      "type": "saving" | "warning" | "opportunity" | "achievement",
      "title": "<short title>",
      "description": "<1-2 sentence actionable advice>",
      "potentialSaving": <number or null>,
      "priority": "high" | "medium" | "low"
    }
  ],
  "recommendations": [
    {
      "action": "<specific action to take>",
      "impact": "<expected outcome>",
      "difficulty": "easy" | "moderate" | "hard"
    }
  ],
  "monthlyTarget": <suggested monthly spending target number>
}

Provide 3-5 insights and 2-3 recommendations. Be specific with dollar amounts.`;

    const userPrompt = `Analyze this spending data:
${JSON.stringify(spendingData, null, 2)}

Provide personalized spending insights and savings recommendations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    // Parse the JSON from the AI response
    let parsed;
    try {
      // Try to extract JSON from potential markdown code fences
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { error: "Failed to parse AI response", raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Spending insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
