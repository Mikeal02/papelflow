/**
 * Action Engine — converts every algorithmic insight into a prioritized,
 * actionable item with deep-link resolution, evidence, and impact estimate.
 *
 * Sources:
 *  - Anomalies (Modified Z-score)
 *  - Recurring patterns (autocorrelation) not yet declared as Subscription
 *  - Budgets exceeded / nearing limit
 *  - Subscriptions due in next 3 days
 *  - Health score weakest dimension
 *  - Cashflow forecast (declining trajectory)
 *  - At-risk goals (deadline vs progress velocity)
 */

import { differenceInDays, parseISO } from 'date-fns';
import type { IntelligenceReport } from './engine';

export type ActionCategory =
  | 'anomaly'
  | 'subscription'
  | 'budget'
  | 'bill'
  | 'health'
  | 'forecast'
  | 'goal';

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityAction {
  id: string;
  category: ActionCategory;
  severity: ActionSeverity;
  /** 0-100 priority score used for ranking */
  priority: number;
  title: string;
  description: string;
  /** Estimated dollar/period impact (positive = potential save) */
  impact?: number;
  impactLabel?: string;
  evidence: { label: string; value: string }[];
  cta: {
    label: string;
    /** Frontend route to deep-link to */
    route?: string;
    /** Resolution intent — handled by ActionCenter */
    intent?: 'navigate' | 'create_subscription' | 'open_budget' | 'open_transaction' | 'open_goal';
    payload?: Record<string, any>;
  };
  /** ISO date this insight became relevant — used for "new" badge */
  detectedAt: string;
}

interface BudgetLite { id: string; amount: number; category_id: string; category?: { name?: string } | null; }
interface SubscriptionLite { id: string; name: string; amount: number; next_due: string; }
interface GoalLite { id: string; name: string; current_amount: number; target_amount: number; deadline?: string | null; }
interface TxLite { id: string; amount: number | string; date: string; type: string; payee?: string | null; category_id?: string | null; }

const SEV_WEIGHT: Record<ActionSeverity, number> = { critical: 100, high: 75, medium: 50, low: 25 };

export function generateActions(opts: {
  report: IntelligenceReport;
  transactions: TxLite[];
  budgets: BudgetLite[];
  subscriptions: SubscriptionLite[];
  goals: GoalLite[];
}): PriorityAction[] {
  const { report, transactions, budgets, subscriptions, goals } = opts;
  const today = new Date();
  const actions: PriorityAction[] = [];

  // 1. Anomalies → high-priority alerts
  for (const a of report.anomalies.slice(0, 8)) {
    const sev: ActionSeverity =
      a.severity === 'extreme' ? 'critical' : a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low';
    actions.push({
      id: `anomaly-${a.id}`,
      category: 'anomaly',
      severity: sev,
      priority: SEV_WEIGHT[sev] + Math.min(15, Math.abs(a.zScore) * 2),
      title: `Unusual spend: ${a.payee}`,
      description: a.reason,
      impact: a.amount,
      impactLabel: 'Transaction value',
      evidence: [
        { label: 'Z-score', value: a.zScore.toString() },
        { label: 'Expected range', value: `${a.expectedRange[0].toFixed(0)} – ${a.expectedRange[1].toFixed(0)}` },
        { label: 'Date', value: a.date },
      ],
      cta: { label: 'Review transaction', intent: 'open_transaction', route: '/transactions', payload: { id: a.id } },
      detectedAt: a.date,
    });
  }

  // 2. Recurring patterns not yet a Subscription → suggest converting
  const subNames = new Set(subscriptions.map(s => s.name.toLowerCase().trim()));
  for (const r of report.recurring) {
    if (r.confidence < 0.55) continue;
    if (subNames.has(r.payee.toLowerCase().trim())) continue;
    const sev: ActionSeverity = r.totalAnnualCost > 600 ? 'high' : r.totalAnnualCost > 200 ? 'medium' : 'low';
    actions.push({
      id: `recurring-${r.signature}`,
      category: 'subscription',
      severity: sev,
      priority: SEV_WEIGHT[sev] + Math.round(r.confidence * 20),
      title: `Track "${r.payee}" as a subscription`,
      description: `Detected ${r.cadence} pattern across ${r.occurrences} payments — converting will surface it in your Subscriptions, alerts, and forecasts.`,
      impact: r.totalAnnualCost,
      impactLabel: 'Annual cost',
      evidence: [
        { label: 'Cadence', value: r.cadence },
        { label: 'Avg amount', value: r.averageAmount.toFixed(2) },
        { label: 'Confidence', value: `${Math.round(r.confidence * 100)}%` },
        { label: 'Next predicted', value: r.nextPredictedDate },
      ],
      cta: { label: 'Add subscription', intent: 'create_subscription', payload: { name: r.payee, amount: r.averageAmount, next_due: r.nextPredictedDate, frequency: cadenceToFreq(r.cadence) } },
      detectedAt: new Date().toISOString().slice(0, 10),
    });
  }

  // 3. Budgets — over or near limit (current month spend vs budget)
  const month = new Date().toISOString().slice(0, 7);
  const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(month));
  const spendByCat = new Map<string, number>();
  for (const t of monthExpenses) {
    if (!t.category_id) continue;
    spendByCat.set(t.category_id, (spendByCat.get(t.category_id) || 0) + Number(t.amount));
  }
  for (const b of budgets) {
    const spent = spendByCat.get(b.category_id) || 0;
    const pct = b.amount > 0 ? spent / b.amount : 0;
    if (pct < 0.8) continue;
    const over = pct >= 1;
    const sev: ActionSeverity = pct >= 1.25 ? 'critical' : over ? 'high' : 'medium';
    actions.push({
      id: `budget-${b.id}`,
      category: 'budget',
      severity: sev,
      priority: SEV_WEIGHT[sev] + Math.min(20, Math.round((pct - 0.8) * 50)),
      title: over ? `Over budget: ${b.category?.name || 'Category'}` : `Approaching budget limit`,
      description: over
        ? `Spent ${Math.round(pct * 100)}% of your ${b.category?.name || ''} budget this month.`
        : `${Math.round(pct * 100)}% of ${b.category?.name || ''} budget used.`,
      impact: spent - b.amount,
      impactLabel: over ? 'Over by' : 'Remaining',
      evidence: [
        { label: 'Budget', value: b.amount.toFixed(0) },
        { label: 'Spent', value: spent.toFixed(0) },
        { label: 'Utilization', value: `${Math.round(pct * 100)}%` },
      ],
      cta: { label: 'Open budget', intent: 'navigate', route: '/budgets' },
      detectedAt: new Date().toISOString().slice(0, 10),
    });
  }

  // 4. Subscriptions due within 3 days
  for (const s of subscriptions) {
    const daysUntil = differenceInDays(parseISO(s.next_due), today);
    if (daysUntil < 0 || daysUntil > 3) continue;
    const sev: ActionSeverity = daysUntil <= 0 ? 'high' : 'medium';
    actions.push({
      id: `bill-${s.id}`,
      category: 'bill',
      severity: sev,
      priority: SEV_WEIGHT[sev] + (3 - daysUntil) * 3,
      title: `${s.name} due ${daysUntil <= 0 ? 'today' : `in ${daysUntil}d`}`,
      description: `Charge of ${Number(s.amount).toFixed(2)} expected on ${s.next_due}.`,
      impact: Number(s.amount),
      impactLabel: 'Amount',
      evidence: [
        { label: 'Due date', value: s.next_due },
        { label: 'Amount', value: Number(s.amount).toFixed(2) },
      ],
      cta: { label: 'View subscriptions', intent: 'navigate', route: '/subscriptions' },
      detectedAt: new Date().toISOString().slice(0, 10),
    });
  }

  // 5. Health score weakest dimension
  const dims = Object.entries(report.health.dimensions);
  const weakest = dims.sort((a, b) => a[1].score - b[1].score)[0];
  if (weakest && weakest[1].score < 60) {
    const sev: ActionSeverity = weakest[1].score < 30 ? 'high' : 'medium';
    actions.push({
      id: `health-${weakest[0]}`,
      category: 'health',
      severity: sev,
      priority: SEV_WEIGHT[sev] + Math.round((60 - weakest[1].score) * 0.4),
      title: `Boost ${humanize(weakest[0])}`,
      description: report.health.topRecommendation,
      impactLabel: 'Health gain',
      impact: Math.round((100 - weakest[1].score) * weakest[1].weight),
      evidence: [
        { label: 'Current score', value: `${Math.round(weakest[1].score)}/100` },
        { label: 'Weight', value: weakest[1].weight.toFixed(2) },
        { label: 'Composite', value: `${report.health.composite}/100` },
      ],
      cta: { label: 'See health breakdown', intent: 'navigate', route: '/analytics' },
      detectedAt: new Date().toISOString().slice(0, 10),
    });
  }

  // 6. Forecast trajectory declining
  if (report.forecast.trend === 'declining' && report.forecast.trendStrength > 0.25) {
    actions.push({
      id: `forecast-decline`,
      category: 'forecast',
      severity: 'high',
      priority: 78,
      title: '30-day cashflow trending down',
      description: `Forecast model projects an end-of-month balance change of ${report.forecast.endOfMonthBalance.toFixed(0)}.`,
      impact: report.forecast.endOfMonthBalance,
      impactLabel: 'Projected balance',
      evidence: [
        { label: 'Trend strength (r²)', value: report.forecast.trendStrength.toFixed(2) },
        { label: 'Trajectory', value: report.forecast.trend },
      ],
      cta: { label: 'Open forecast', intent: 'navigate', route: '/analytics' },
      detectedAt: new Date().toISOString().slice(0, 10),
    });
  }

  // 7. At-risk goals
  for (const g of goals) {
    if (!g.deadline) continue;
    const daysLeft = differenceInDays(parseISO(g.deadline), today);
    if (daysLeft <= 0) continue;
    const remaining = Number(g.target_amount) - Number(g.current_amount);
    if (remaining <= 0) continue;
    const monthlyNeeded = (remaining / Math.max(1, daysLeft)) * 30;
    // simple heuristic: at risk if monthlyNeeded > 25% of last 30d income
    const last30Income = transactions
      .filter(t => t.type === 'income' && differenceInDays(today, parseISO(t.date)) <= 30)
      .reduce((s, t) => s + Number(t.amount), 0);
    if (last30Income > 0 && monthlyNeeded / last30Income > 0.25) {
      actions.push({
        id: `goal-${g.id}`,
        category: 'goal',
        severity: 'medium',
        priority: 55 + Math.min(20, Math.round((monthlyNeeded / last30Income) * 30)),
        title: `Goal at risk: ${g.name}`,
        description: `Needs ~${monthlyNeeded.toFixed(0)}/mo to hit deadline — ${Math.round((monthlyNeeded / last30Income) * 100)}% of recent income.`,
        impact: remaining,
        impactLabel: 'Remaining',
        evidence: [
          { label: 'Days left', value: daysLeft.toString() },
          { label: 'Monthly needed', value: monthlyNeeded.toFixed(0) },
          { label: 'Progress', value: `${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}%` },
        ],
        cta: { label: 'Adjust goal', intent: 'navigate', route: '/goals' },
        detectedAt: new Date().toISOString().slice(0, 10),
      });
    }
  }

  // Apply dismissals from local storage
  const dismissed = readDismissed();
  return actions
    .filter(a => !dismissed.has(a.id))
    .sort((a, b) => b.priority - a.priority);
}

function cadenceToFreq(c: string): string {
  if (c === 'weekly') return 'weekly';
  if (c === 'biweekly') return 'biweekly';
  if (c === 'quarterly') return 'quarterly';
  if (c === 'yearly') return 'yearly';
  return 'monthly';
}

function humanize(s: string): string {
  return s.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

const DISMISS_KEY = 'finflow:action-center:dismissed';
const SNOOZE_KEY = 'finflow:action-center:snoozed';

export function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const obj = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    // dismissed entries expire after 30 days; snoozed handled separately
    const valid = Object.entries(obj).filter(([, ts]) => now - ts < 1000 * 60 * 60 * 24 * 30);
    return new Set(valid.map(([id]) => id));
  } catch { return new Set(); }
}

export function dismissAction(id: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
  } catch {}
}

export function snoozeAction(id: string, hours = 24) {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = Date.now() + hours * 3600 * 1000;
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(obj));
    // also dismiss for now; will reappear after snooze expiry on next computation cycle
    dismissAction(id);
  } catch {}
}

export function summarizeBySeverity(actions: PriorityAction[]) {
  const sum = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of actions) sum[a.severity]++;
  return sum;
}
