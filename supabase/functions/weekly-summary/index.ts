import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a personal finance advisor. Provide concise, actionable insights." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1e 0%, #141418 100%); border-radius: 20px; padding: 40px; border: 1px solid rgba(255,255,255,0.1); }
    .logo { color: #22c55e; font-size: 28px; font-weight: bold; margin-bottom: 8px; }
    .period { color: #888; font-size: 14px; margin-bottom: 32px; }
    h1 { margin: 0 0 8px; font-size: 32px; background: linear-gradient(135deg, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .ai-summary { background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; padding: 24px; margin: 24px 0; }
    .ai-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .ai-text { font-size: 16px; line-height: 1.6; color: #e5e5e5; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
    .stat-label { color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .income { color: #22c55e; }
    .expense { color: #ef4444; }
    .savings { color: #3b82f6; }
    .neutral { color: #f59e0b; }
    .highlights { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px; margin: 24px 0; }
    .highlight-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .highlight-item:last-child { border-bottom: none; }
    .highlight-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
    .categories { margin: 24px 0; }
    .category-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .category-item:last-child { border-bottom: none; }
    .category-rank { background: rgba(255,255,255,0.1); color: #888; width: 24px; height: 24px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; }
    .tip-box { background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; padding: 20px; margin: 24px 0; }
    .tip-title { color: #3b82f6; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); color: #666; font-size: 13px; text-align: center; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📊 Finflow</div>
    <h1>Your Weekly Summary</h1>
    <p class="period">${period}</p>
    
    <div class="ai-summary">
      <div class="ai-badge">✨ AI Insights</div>
      <p class="ai-text">${insights.summary}</p>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value income">${summary.currency}${summary.totalIncome.toLocaleString()}</div>
        <div class="stat-label">Income</div>
      </div>
      <div class="stat-card">
        <div class="stat-value expense">${summary.currency}${summary.totalExpenses.toLocaleString()}</div>
        <div class="stat-label">Expenses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value savings">${summary.currency}${summary.netSavings.toLocaleString()}</div>
        <div class="stat-label">Net Savings</div>
      </div>
      <div class="stat-card">
        <div class="stat-value neutral">${savingsRate}%</div>
        <div class="stat-label">Savings Rate</div>
      </div>
    </div>
    
    <div class="highlights">
      <h3 style="margin: 0 0 16px; font-size: 16px;">Key Highlights</h3>
      ${insights.highlights.map(h => `
        <div class="highlight-item">
          <div class="highlight-dot"></div>
          <span>${h}</span>
        </div>
      `).join('')}
    </div>
    
    ${summary.topCategories.length > 0 ? `
    <div class="categories">
      <h3 style="margin: 0 0 16px; font-size: 16px;">Top Spending Categories</h3>
      ${summary.topCategories.slice(0, 5).map((cat, i) => `
        <div class="category-item">
          <span><span class="category-rank">${i + 1}</span>${cat.name}</span>
          <span class="expense">${summary.currency}${cat.amount.toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="tip-box">
      <div class="tip-title">💡 ${insights.recommendation}</div>
      <p style="margin: 0; color: #e5e5e5; font-size: 14px;">${insights.savingsTip}</p>
    </div>
    
    <center>
      <a href="https://papelflow.lovable.app" class="cta-button">View Full Dashboard →</a>
    </center>
    
    <div class="footer">
      <p>This is your automated weekly summary from Finflow.</p>
      <p>© 2026 Finflow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
}

async function getUsersWithTransactions(supabase: any, startDate: string, endDate: string): Promise<UserSummary[]> {
  // Get all users with transactions in the period
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select(`
      user_id,
      type,
      amount,
      category_id,
      categories (name)
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (txError) {
    console.error("Error fetching transactions:", txError);
    return [];
  }

  // Get user profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, full_name, preferred_currency');

  if (profileError) {
    console.error("Error fetching profiles:", profileError);
    return [];
  }

  // Get auth users for emails
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.error("Error fetching users:", usersError);
    return [];
  }

  // Group transactions by user
  const userMap = new Map<string, UserSummary>();

  for (const tx of transactions || []) {
    if (!userMap.has(tx.user_id)) {
      const profile = profiles?.find((p: any) => p.user_id === tx.user_id);
      const authUser = users?.find((u: any) => u.id === tx.user_id);
      
      if (!authUser?.email) continue;

      userMap.set(tx.user_id, {
        userId: tx.user_id,
        email: authUser.email,
        fullName: profile?.full_name || authUser.email.split('@')[0],
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        topCategories: [],
        transactionCount: 0,
        currency: profile?.preferred_currency || 'USD',
      });
    }

    const summary = userMap.get(tx.user_id)!;
    summary.transactionCount++;

    if (tx.type === 'income') {
      summary.totalIncome += Number(tx.amount);
    } else if (tx.type === 'expense') {
      summary.totalExpenses += Number(tx.amount);
      
      // Track category spending
      const categoryName = tx.categories?.name || 'Uncategorized';
      const existing = summary.topCategories.find(c => c.name === categoryName);
      if (existing) {
        existing.amount += Number(tx.amount);
      } else {
        summary.topCategories.push({ name: categoryName, amount: Number(tx.amount) });
      }
    }
  }

  // Calculate net savings and sort categories
  for (const summary of userMap.values()) {
    summary.netSavings = summary.totalIncome - summary.totalExpenses;
    summary.topCategories.sort((a, b) => b.amount - a.amount);
  }

  return Array.from(userMap.values());
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const period = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    // Get users with transactions
    const userSummaries = await getUsersWithTransactions(supabase, startStr, endStr);
    
    console.log(`Found ${userSummaries.length} users with transactions this week`);

    const results = [];

    for (const summary of userSummaries) {
      try {
        // Generate AI insights
        const insights = await generateAIInsights(summary);
        
        // Generate email HTML
        const html = generateEmailHtml(summary, insights, period);

        // Send email via Resend
        if (RESEND_API_KEY) {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Finflow <onboarding@resend.dev>",
              to: [summary.email],
              subject: `📊 Your Weekly Financial Summary - ${period}`,
              html,
            }),
          });

          if (!emailRes.ok) {
            const errData = await emailRes.json();
            console.error(`Email failed for ${summary.email}:`, errData);
            results.push({ email: summary.email, status: 'failed', error: errData.message });
          } else {
            console.log(`Email sent to ${summary.email}`);
            results.push({ email: summary.email, status: 'sent' });
          }
        } else {
          results.push({ email: summary.email, status: 'skipped', reason: 'no_api_key' });
        }
      } catch (error) {
        console.error(`Error processing ${summary.email}:`, error);
        results.push({ email: summary.email, status: 'error', error: String(error) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        period,
        processed: userSummaries.length,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Weekly summary error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
