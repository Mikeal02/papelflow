import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders, json, requireAuth, escapeHtml, num } from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface EmailRequest {
  type: 'budget_alert' | 'weekly_summary' | 'monthly_summary';
  userName?: string;
  data: {
    budgetName?: string;
    spent?: number;
    limit?: number;
    percentage?: number;
    currency?: string;
    totalIncome?: number;
    totalExpenses?: number;
    netSavings?: number;
    topCategories?: Array<{ name: string; amount: number }>;
    period?: string;
  };
}

const ALLOWED_TYPES = new Set(['budget_alert', 'weekly_summary', 'monthly_summary']);
const MAX_NAME_LEN = 80;
const MAX_CATEGORIES = 10;

// Sanitise a currency symbol (accept only common finance glyphs / alpha codes).
const safeCurrency = (c?: string) => {
  const s = (c ?? '$').toString().slice(0, 4);
  return /^[A-Za-z$€£¥₹₽¢₩₺₪R$]{1,4}$/.test(s) ? s : '$';
};

const fmtMoney = (n?: number) => num(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

const generateBudgetAlertHtml = (userName: string, data: EmailRequest['data']) => {
  const pct = Math.max(0, Math.min(999, num(data.percentage)));
  const cur = safeCurrency(data.currency);
  const fillColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
  const pctColor = pct >= 100 ? '#ef4444' : '#f59e0b';
  return `<!DOCTYPE html>
<html><head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #1a1a1e; border-radius: 16px; padding: 40px; }
  .logo { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 24px; }
  h1 { margin: 0 0 16px; font-size: 28px; }
  .alert-box { background: linear-gradient(135deg, #f59e0b20, #ef444420); border: 1px solid #f59e0b40; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .progress-bar { height: 12px; background: #333; border-radius: 6px; overflow: hidden; margin: 16px 0; }
  .progress-fill { height: 100%; background: ${fillColor}; border-radius: 6px; }
  .stats { display: flex; justify-content: space-between; margin-top: 16px; }
  .stat { text-align: center; }
  .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }
  .stat-label { color: #888; font-size: 14px; }
  .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; color: #666; font-size: 14px; text-align: center; }
</style></head><body>
  <div class="container">
    <div class="logo">Finflow</div>
    <h1>Budget Alert</h1>
    <p>Hi ${escapeHtml(userName)},</p>
    <p>Your <strong>${escapeHtml(data.budgetName)}</strong> budget needs attention.</p>
    <div class="alert-box">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 18px;">${escapeHtml(data.budgetName)}</span>
        <span style="font-size: 24px; font-weight: bold; color: ${pctColor};">${pct.toFixed(0)}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${Math.min(pct, 100)}%;"></div></div>
      <div class="stats">
        <div class="stat"><div class="stat-value">${escapeHtml(cur)}${fmtMoney(data.spent)}</div><div class="stat-label">Spent</div></div>
        <div class="stat"><div class="stat-value">${escapeHtml(cur)}${fmtMoney(data.limit)}</div><div class="stat-label">Budget Limit</div></div>
      </div>
    </div>
    <p>${pct >= 100 ? 'You have exceeded your budget limit. Consider reviewing your expenses.' : 'You are approaching your budget limit. Time to slow down on spending in this category.'}</p>
    <div class="footer"><p>Automated alert from Finflow.</p><p>© 2026 Finflow.</p></div>
  </div>
</body></html>`;
};

const generateSummaryHtml = (userName: string, data: EmailRequest['data'], isMonthly: boolean) => {
  const cur = safeCurrency(data.currency);
  const cats = (data.topCategories ?? []).slice(0, MAX_CATEGORIES);
  return `<!DOCTYPE html>
<html><head><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0b; color: #fff; margin: 0; padding: 40px 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #1a1a1e; border-radius: 16px; padding: 40px; }
  .logo { color: #22c55e; font-size: 24px; font-weight: bold; margin-bottom: 24px; }
  h1 { margin: 0 0 8px; font-size: 28px; }
  .period { color: #888; margin-bottom: 24px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
  .stat-card { background: #222; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
  .income { color: #22c55e; } .expense { color: #ef4444; } .savings { color: #3b82f6; }
  .stat-label { color: #888; font-size: 14px; }
  .categories { background: #222; border-radius: 12px; padding: 24px; margin: 24px 0; }
  .category-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #333; }
  .category-item:last-child { border-bottom: none; }
  .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #333; color: #666; font-size: 14px; text-align: center; }
</style></head><body>
  <div class="container">
    <div class="logo">Finflow</div>
    <h1>${isMonthly ? 'Monthly' : 'Weekly'} Summary</h1>
    <p class="period">${escapeHtml(data.period)}</p>
    <p>Hi ${escapeHtml(userName)}, here's your financial overview:</p>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value income">${escapeHtml(cur)}${fmtMoney(data.totalIncome)}</div><div class="stat-label">Income</div></div>
      <div class="stat-card"><div class="stat-value expense">${escapeHtml(cur)}${fmtMoney(data.totalExpenses)}</div><div class="stat-label">Expenses</div></div>
      <div class="stat-card"><div class="stat-value savings">${escapeHtml(cur)}${fmtMoney(data.netSavings)}</div><div class="stat-label">Net Savings</div></div>
    </div>
    ${cats.length ? `<div class="categories"><h3 style="margin: 0 0 16px;">Top Spending Categories</h3>${cats.map((cat, i) => `<div class="category-item"><span>${i + 1}. ${escapeHtml(cat.name)}</span><span class="expense">${escapeHtml(cur)}${fmtMoney(cat.amount)}</span></div>`).join('')}</div>` : ''}
    <div class="footer"><p>Your ${isMonthly ? 'monthly' : 'weekly'} summary from Finflow.</p><p>© 2026 Finflow.</p></div>
  </div>
</body></html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Require authenticated caller — email is always sent to the caller's own address.
  const authed = await requireAuth(req);
  if (authed instanceof Response) return authed;
  if (!authed.email) return json({ error: "no_email_on_account" }, 400);

  if (!RESEND_API_KEY) return json({ error: "email_service_unavailable" }, 503);

  let body: EmailRequest;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  if (!body || typeof body !== "object" || !ALLOWED_TYPES.has(body.type as string)) {
    return json({ error: "invalid_type" }, 400);
  }
  const userName = (body.userName ?? "there").toString().slice(0, MAX_NAME_LEN);
  const data = (body.data && typeof body.data === "object") ? body.data : {};

  let subject: string;
  let html: string;
  switch (body.type) {
    case 'budget_alert': {
      const name = (data.budgetName ?? 'Budget').toString().slice(0, MAX_NAME_LEN);
      const pct = num(data.percentage).toFixed(0);
      subject = `Budget Alert: ${name} at ${pct}%`;
      html = generateBudgetAlertHtml(userName, { ...data, budgetName: name });
      break;
    }
    case 'weekly_summary':
      subject = `Your Weekly Financial Summary`;
      html = generateSummaryHtml(userName, data, false);
      break;
    case 'monthly_summary':
      subject = `Your Monthly Financial Summary`;
      html = generateSummaryHtml(userName, data, true);
      break;
    default:
      return json({ error: "invalid_type" }, 400);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "Finflow <onboarding@resend.dev>",
      to: [authed.email], // hard-locked to caller — cannot be spoofed via request body.
      subject,
      html,
    }),
  });

  if (!res.ok) {
    let msg = 'send_failed';
    try { const e = await res.json(); msg = e?.message || msg; } catch { /* ignore */ }
    console.error('Resend error:', res.status, msg);
    return json({ error: msg }, 502);
  }
  const emailResponse = await res.json();
  return json({ id: emailResponse?.id ?? null });
});
