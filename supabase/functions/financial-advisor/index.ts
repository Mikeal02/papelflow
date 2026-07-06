import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, json, requireAuth } from "../_shared/security.ts";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LEN = 4000;
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;

  try {
    const body = await req.json().catch(() => null);
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages || rawMessages.length === 0 || rawMessages.length > MAX_MESSAGES) {
      return json({ error: "invalid_messages" }, 400);
    }
    const messages = rawMessages.map((m: any) => ({
      role: ALLOWED_ROLES.has(m?.role) ? m.role : "user",
      content: typeof m?.content === "string" ? m.content.slice(0, MAX_MESSAGE_LEN) : "",
    })).filter((m: { content: string }) => m.content.length > 0);
    if (messages.length === 0) return json({ error: "invalid_messages" }, 400);

    // Never trust client-supplied financial context verbatim — coerce to a
    // small, plain object of primitive fields the model can safely read.
    const fc = body?.financialContext ?? null;
    const financialContext = fc && typeof fc === "object" ? {
      totalBalance: fc.totalBalance,
      monthlyIncome: fc.monthlyIncome,
      monthlyExpenses: fc.monthlyExpenses,
      savingsRate: fc.savingsRate,
      topCategories: Array.isArray(fc.topCategories) ? fc.topCategories.slice(0, 10).map(String) : [],
      activeGoals: fc.activeGoals,
      budgetStatus: typeof fc.budgetStatus === "string" ? fc.budgetStatus.slice(0, 200) : undefined,
    } : null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "ai_service_unavailable" }, 503);

    const systemPrompt = `You are a helpful AI financial advisor assistant. You help users understand their finances, provide budgeting tips, and offer personalized advice based on their spending patterns.

Current Financial Context:
${financialContext ? `
- Total Balance: ${financialContext.totalBalance}
- Monthly Income: ${financialContext.monthlyIncome}
- Monthly Expenses: ${financialContext.monthlyExpenses}
- Savings Rate: ${financialContext.savingsRate}%
- Top Spending Categories: ${financialContext.topCategories?.join(', ') || 'N/A'}
- Active Goals: ${financialContext.activeGoals || 0}
- Budget Status: ${financialContext.budgetStatus || 'N/A'}
` : 'No financial data available yet.'}

Guidelines:
- Be concise and actionable in your advice
- Use the financial context to personalize recommendations
- Suggest specific dollar amounts when helpful
- Encourage positive financial habits
- Never provide investment advice or specific stock recommendations
- Keep responses under 200 words unless asked for detail`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Financial advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
