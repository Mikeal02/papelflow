import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'budget_alert' | 'weekly_summary' | 'monthly_summary';
  to: string;
  userName: string;
  data: {
    // Budget alert data
    budgetName?: string;
    spent?: number;
    limit?: number;
    percentage?: number;
    currency?: string;
    // Summary data
    totalIncome?: number;
    totalExpenses?: number;
    netSavings?: number;
    topCategories?: Array<{ name: string; amount: number }>;
    period?: string;
  };
}

const generateBudgetAlertHtml = (userName: string, data: EmailRequest['data']) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a1e; border-radius: 16px; padding: 40px; }
    .logo { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 24px; }
    h1 { margin: 0 0 16px; font-size: 28px; }
    .alert-box { background: linear-gradient(135deg, #f59e0b20, #ef444420); border: 1px solid #f59e0b40; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .progress-bar { height: 12px; background: #333; border-radius: 6px; overflow: hidden; margin: 16px 0; }
    .progress-fill { height: 100%; background: ${(data.percentage || 0) >= 100 ? '#ef4444' : (data.percentage || 0) >= 80 ? '#f59e0b' : '#22c55e'}; border-radius: 6px; }
    .stats { display: flex; justify-content: space-between; margin-top: 16px; }
    .stat { text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }
    .stat-label { color: #888; font-size: 14px; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; color: #666; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📊 Finflow</div>
    <h1>Budget Alert</h1>
    <p>Hi ${userName},</p>
    <p>Your <strong>${data.budgetName}</strong> budget needs attention.</p>
    
    <div class="alert-box">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px;">${data.budgetName}</span>
        <span style="font-size: 24px; font-weight: bold; color: ${(data.percentage || 0) >= 100 ? '#ef4444' : '#f59e0b'};">${data.percentage?.toFixed(0)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${Math.min(data.percentage || 0, 100)}%;"></div>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${data.currency}${data.spent?.toLocaleString()}</div>
          <div class="stat-label">Spent</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.currency}${data.limit?.toLocaleString()}</div>
          <div class="stat-label">Budget Limit</div>
        </div>
      </div>
    </div>
    
    <p>${(data.percentage || 0) >= 100 ? 'You have exceeded your budget limit. Consider reviewing your expenses.' : 'You are approaching your budget limit. Time to slow down on spending in this category.'}</p>
    
    <div class="footer">
      <p>This is an automated alert from Finflow.</p>
      <p>© 2026 Finflow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const generateSummaryHtml = (userName: string, data: EmailRequest['data'], isMonthly: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a1e; border-radius: 16px; padding: 40px; }
    .logo { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .period { color: #888; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat-card { background: #222; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .income { color: #22c55e; }
    .expense { color: #ef4444; }
    .savings { color: #3b82f6; }
    .stat-label { color: #888; font-size: 14px; }
    .categories { background: #222; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
    .category-item:last-child { border-bottom: none; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; color: #666; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📊 Finflow</div>
    <h1>${isMonthly ? 'Monthly' : 'Weekly'} Summary</h1>
    <p class="period">${data.period}</p>
    <p>Hi ${userName}, here's your financial overview:</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value income">${data.currency}${data.totalIncome?.toLocaleString()}</div>
        <div class="stat-label">Income</div>
      </div>
      <div class="stat-card">
        <div class="stat-value expense">${data.currency}${data.totalExpenses?.toLocaleString()}</div>
        <div class="stat-label">Expenses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value savings">${data.currency}${data.netSavings?.toLocaleString()}</div>
        <div class="stat-label">Net Savings</div>
      </div>
    </div>
    
    ${data.topCategories && data.topCategories.length > 0 ? `
    <div class="categories">
      <h3 style="margin: 0 0 16px;">Top Spending Categories</h3>
      ${data.topCategories.map((cat, i) => `
        <div class="category-item">
          <span>${i + 1}. ${cat.name}</span>
          <span class="expense">${data.currency}${cat.amount.toLocaleString()}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
      <p>This is your ${isMonthly ? 'monthly' : 'weekly'} financial summary from Finflow.</p>
      <p>© 2026 Finflow. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, to, userName, data }: EmailRequest = await req.json();

    let subject: string;
    let html: string;

    switch (type) {
      case 'budget_alert':
        subject = `⚠️ Budget Alert: ${data.budgetName} at ${data.percentage?.toFixed(0)}%`;
        html = generateBudgetAlertHtml(userName, data);
        break;
      case 'weekly_summary':
        subject = `📊 Your Weekly Financial Summary - ${data.period}`;
        html = generateSummaryHtml(userName, data, false);
        break;
      case 'monthly_summary':
        subject = `📊 Your Monthly Financial Summary - ${data.period}`;
        html = generateSummaryHtml(userName, data, true);
        break;
      default:
        throw new Error('Invalid email type');
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Finflow <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResponse = await res.json();

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
