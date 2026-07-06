import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, escapeHtml, requireAuth } from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const CRON_SECRET = Deno.env.get("WEEKLY_SUMMARY_CRON_SECRET");

interface UserSummary {
  userId: string;
  email: string;
  fullName: string;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  topCategories: Array<{ name: string; amount: number }>;
  transactionCount: number;
  currency: string;
}

interface AIInsight {
  summary: string;
  highlights: string[];
  recommendation: string;
  savingsTip: string;
}

async function generateAIInsights(summary: UserSummary): Promise<AIInsight> {
  if (!LOVABLE_API_KEY) {
    return {
      summary: `You had ${summary.transactionCount} transactions this week.`,
      highlights: [`Spent ${summary.currency}${summary.totalExpenses.toLocaleString()}`],
      recommendation: "Keep tracking your expenses!",
      savingsTip: "Consider setting up budget alerts.",
    };
  }
  const prompt = `Analyze this weekly financial summary and provide personalized insights:
- Total Income: ${summary.currency}${summary.totalIncome.toLocaleString()}
- Total Expenses: ${summary.currency}${summary.totalExpenses.toLocaleString()}
- Net Savings: ${summary.currency}${summary.netSavings.toLocaleString()}
- Transactions: ${summary.transactionCount}
- Top Categories: ${summary.topCategories.map(c => `${c.name}: ${summary.currency}${c.amount}`).join(', ')}

Return a JSON object (no markdown, no code fences) with:
{
  "summary": "One sentence overview of the week",
  "highlights": ["2-3 key observations"],
  "recommendation": "One actionable recommendation",
  "savingsTip": "One money-saving tip based on spending patterns"
}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a personal finance advisor. Provide concise, actionable insights." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    return JSON.parse(jsonMatch[1].trim());
  } catch (error) {
    console.error("AI insights error:", error);
    return {
      summary: `You had ${summary.transactionCount} transactions totaling ${summary.currency}${summary.totalExpenses.toLocaleString()} in expenses.`,
      highlights: [
        `Income: ${summary.currency}${summary.totalIncome.toLocaleString()}`,
        `Saved: ${summary.currency}${summary.netSavings.toLocaleString()}`,
      ],
      recommendation: "Review your top spending categories for optimization opportunities.",
      savingsTip: "Automating transfers to savings can help build your emergency fund.",
    };
  }
}

function generateEmailHtml(summary: UserSummary, insights: AIInsight, period: string): string {
  const savingsRate = summary.totalIncome > 0
    ? ((summary.netSavings / summary.totalIncome) * 100).toFixed(1)
    : "0";
  const cur = escapeHtml(summary.currency);
  // Every string interpolated below is passed through escapeHtml to neutralise
  // any HTML/script fragments that could arrive from AI output or DB fields.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1e 0%, #141418 100%); border-radius: 20px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
  .logo { color: #22c55e; font-size: 28px; font-weight: bold; margin-bottom: 8px; }
  .period { color: #888; font-size: 14px; margin-bottom: 32px; }
  h1 { margin: 0 0 8px; font-size: 32px; color: #fff; }
  .ai-summary { background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; padding: 24px; margin: 24px 0; }
  .ai-badge { display: inline-block; background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .ai-text { font-size: 16px; line-height: 1.6; color: #e5e5e5; }
  .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
  .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
  .stat-label { color: #888; font-size: 13px; }
  .income { color: #22c55e; } .expense { color: #ef4444; } .savings { color: #3b82f6; } .neutral { color: #f59e0b; }
  .highlights { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin: 24px 0; }
  .highlight-item { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .categories { margin: 24px 0; }
  .category-item { display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
  .tip-box { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; padding: 20px; margin: 24px 0; }
  .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); color: #666; font-size: 13px; text-align: center; }
</style></head><body>
  <div class="container">
    <div class="logo">Finflow</div>
    <h1>Your Weekly Summary</h1>
    <p class="period">${escapeHtml(period)}</p>
    <div class="ai-summary">
      <div class="ai-badge">AI Insights</div>
      <p class="ai-text">${escapeHtml(insights.summary)}</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value income">${cur}${summary.totalIncome.toLocaleString()}</div><div class="stat-label">Income</div></div>
      <div class="stat-card"><div class="stat-value expense">${cur}${summary.totalExpenses.toLocaleString()}</div><div class="stat-label">Expenses</div></div>
      <div class="stat-card"><div class="stat-value savings">${cur}${summary.netSavings.toLocaleString()}</div><div class="stat-label">Net Savings</div></div>
      <div class="stat-card"><div class="stat-value neutral">${escapeHtml(savingsRate)}%</div><div class="stat-label">Savings Rate</div></div>
    </div>
    <div class="highlights">
      <h3 style="margin: 0 0 16px; font-size: 16px;">Key Highlights</h3>
      ${(insights.highlights || []).slice(0, 5).map(h => `<div class="highlight-item">${escapeHtml(h)}</div>`).join('')}
    </div>
    ${summary.topCategories.length > 0 ? `
    <div class="categories">
      <h3 style="margin: 0 0 16px; font-size: 16px;">Top Spending Categories</h3>
      ${summary.topCategories.slice(0, 5).map((cat, i) => `
        <div class="category-item">
          <span>${i + 1}. ${escapeHtml(cat.name)}</span>
          <span class="expense">${cur}${cat.amount.toLocaleString()}</span>
        </div>`).join('')}
    </div>` : ''}
    <div class="tip-box">
      <div style="color: #3b82f6; font-weight: 600; margin-bottom: 8px;">${escapeHtml(insights.recommendation)}</div>
      <p style="margin: 0; color: #e5e5e5; font-size: 14px;">${escapeHtml(insights.savingsTip)}</p>
    </div>
    <div class="footer"><p>Automated weekly summary from Finflow.</p><p>© 2026 Finflow.</p></div>
  </div>
</body></html>`;
}

async function summariseUsers(
  supabase: ReturnType<typeof createClient>,
  startDate: string,
  endDate: string,
  onlyUserId?: string,
): Promise<UserSummary[]> {
  let txQuery = supabase
    .from('transactions')
    .select('user_id, type, amount, category_id, categories (name)')
    .gte('date', startDate)
    .lte('date', endDate);
  if (onlyUserId) txQuery = txQuery.eq('user_id', onlyUserId);
  const { data: transactions, error: txError } = await txQuery;
  if (txError) { console.error("Error fetching transactions:", txError); return []; }

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, full_name, preferred_currency');
  if (profileError) { console.error("Error fetching profiles:", profileError); return []; }

  const { data: usersResp, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) { console.error("Error fetching users:", usersError); return []; }
  const users = (usersResp as any)?.users ?? [];

  const userMap = new Map<string, UserSummary>();
  for (const tx of (transactions as any[]) || []) {
    if (!userMap.has(tx.user_id)) {
      const profile = profiles?.find((p: any) => p.user_id === tx.user_id);
      const authUser = users.find((u: any) => u.id === tx.user_id);
      if (!authUser?.email) continue;
      userMap.set(tx.user_id, {
        userId: tx.user_id, email: authUser.email,
        fullName: profile?.full_name || authUser.email.split('@')[0],
        totalIncome: 0, totalExpenses: 0, netSavings: 0,
        topCategories: [], transactionCount: 0,
        currency: profile?.preferred_currency || 'USD',
      });
    }
    const s = userMap.get(tx.user_id)!;
    s.transactionCount++;
    if (tx.type === 'income') s.totalIncome += Number(tx.amount);
    else if (tx.type === 'expense') {
      s.totalExpenses += Number(tx.amount);
      const name = tx.categories?.name || 'Uncategorized';
      const existing = s.topCategories.find(c => c.name === name);
      if (existing) existing.amount += Number(tx.amount);
      else s.topCategories.push({ name, amount: Number(tx.amount) });
    }
  }
  for (const s of userMap.values()) {
    s.netSavings = s.totalIncome - s.totalExpenses;
    s.topCategories.sort((a, b) => b.amount - a.amount);
  }
  return Array.from(userMap.values());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "server_misconfigured" }, 500);

  // Two auth modes:
  //  1. Scheduled cron: valid `x-cron-secret` header → fan out to all users.
  //  2. User-triggered: valid JWT → generate summary only for that caller.
  //     This prevents an attacker from spamming every user's inbox or
  //     exhausting AI/Resend budget through the public endpoint.
  const cronHeader = req.headers.get("x-cron-secret");
  let onlyUserId: string | undefined;
  if (cronHeader) {
    if (!CRON_SECRET || cronHeader !== CRON_SECRET) return json({ error: "unauthorized" }, 401);
  } else {
    const authed = await requireAuth(req);
    if (authed instanceof Response) return authed;
    onlyUserId = authed.id;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const period = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const userSummaries = await summariseUsers(supabase, startStr, endStr, onlyUserId);
    console.log(`Processing ${userSummaries.length} user summary/summaries`);

    const results: Array<Record<string, unknown>> = [];
    for (const summary of userSummaries) {
      try {
        const insights = await generateAIInsights(summary);
        const html = generateEmailHtml(summary, insights, period);
        if (RESEND_API_KEY) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Finflow <onboarding@resend.dev>",
              to: [summary.email],
              subject: `Your Weekly Financial Summary - ${period}`,
              html,
            }),
          });
          if (!emailRes.ok) {
            const errData = await emailRes.json().catch(() => ({}));
            console.error(`Email failed for user ${summary.userId}`);
            results.push({ userId: summary.userId, status: 'failed', error: errData?.message ?? 'unknown' });
          } else {
            results.push({ userId: summary.userId, status: 'sent' });
          }
        } else {
          results.push({ userId: summary.userId, status: 'skipped', reason: 'no_api_key' });
        }
      } catch (error) {
        console.error(`Error processing user ${summary.userId}:`, error);
        results.push({ userId: summary.userId, status: 'error' });
      }
    }

    return json({ success: true, period, processed: userSummaries.length, results });
  } catch (error) {
    console.error("Weekly summary error:", error);
    return json({ error: "internal_error" }, 500);
  }
});
