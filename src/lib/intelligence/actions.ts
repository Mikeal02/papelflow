/**
 * Elite Action Engine v2 — converts every algorithmic insight into a prioritized,
 * actionable item with multi-factor scoring, deep-link resolution, evidence,
 * confidence, urgency, effort estimate, and history tracking.
 *
 * Sources:
 *  - Anomalies (Modified Z-score)
 *  - Recurring patterns (autocorrelation) not yet declared as Subscription
 *  - Budgets exceeded / nearing limit
 *  - Subscriptions due in next 7 days
 *  - Health score weakest dimensions
 *  - Cashflow forecast (declining trajectory)
 *  - At-risk goals (deadline vs progress velocity)
 *  - Savings opportunity (low savings rate vs income)
 *  - Cash drag (idle cash > threshold)
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
  | 'goal'
  | 'savings'
  | 'cash';

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'open' | 'snoozed' | 'pinned' | 'dismissed' | 'resolved';

export interface ScoreBreakdown {
  severity: number;     // 0-40
  impact: number;       // 0-25
  urgency: number;      // 0-20
  confidence: number;   // 0-10
  recency: number;      // 0-5
}

export interface PriorityAction {
  id: string;
  category: ActionCategory;
  severity: ActionSeverity;
  /** 0-100 priority score used for ranking */
  priority: number;
  /** Decomposition of the priority score for transparency */
  score: ScoreBreakdown;
  /** 0-1 algorithm confidence */
  confidence: number;
  /** Days until this becomes acute (negative = past due, undefined = none) */
  urgencyDays?: number;
  /** Estimated minutes to resolve */
  effortMinutes: number;
  title: string;
  description: string;
  /** Estimated dollar/period impact (positive = potential save) */
  impact?: number;
  impactLabel?: string;
  /** Free-form tags for filtering / grouping */
  tags: string[];
  evidence: { label: string; value: string }[];
  cta: {
    label: string;
    /** Frontend route to deep-link to */
    route?: string;
    /** Resolution intent — handled by ActionCenter */
    intent?: 'navigate' | 'create_subscription' | 'open_budget' | 'open_transaction' | 'open_goal';
    payload?: Record<string, any>;
  };
  /** Optional secondary actions (e.g. dismiss-as-not-an-issue) */
  secondaryActions?: { label: string; intent: 'navigate'; route: string }[];
  /** ISO date this insight became relevant — used for "new" badge */
  detectedAt: string;
}

interface BudgetLite { id: string; amount: number; category_id: string; category?: { name?: string } | null; }
interface SubscriptionLite { id: string; name: string; amount: number; next_due: string; }
interface GoalLite { id: string; name: string; current_amount: number; target_amount: number; deadline?: string | null; }
interface AccountLite { id: string; type?: string; balance?: number | string; }
interface TxLite { id: string; amount: number | string; date: string; type: string; payee?: string | null; category_id?: string | null; }

const SEV_BASE: Record<ActionSeverity, number> = { critical: 40, high: 30, medium: 20, low: 10 };

/**
 * Compute a normalized 0-100 priority score from independent factors.
 * Each factor is bounded — no single signal can dominate ranking.
 */
function computeScore(opts: {
  severity: ActionSeverity;
  impact: number;        // raw $ value, signed
  income: number;        // monthly income for normalization
  urgencyDays?: number;  // smaller = more urgent
  confidence: number;    // 0-1
  ageDays: number;       // how new is the insight
}): { breakdown: ScoreBreakdown; total: number } {
  const sev = SEV_BASE[opts.severity];
  const impactRatio = opts.income > 0 ? Math.abs(opts.impact) / opts.income : Math.min(1, Math.abs(opts.impact) / 1000);
  const impact = Math.min(25, Math.round(impactRatio * 25));
  const urg = opts.urgencyDays === undefined
    ? 8
    : opts.urgencyDays <= 0 ? 20
    : opts.urgencyDays <= 3 ? 16
    : opts.urgencyDays <= 7 ? 12
    : opts.urgencyDays <= 14 ? 8
    : 4;
  const conf = Math.round(Math.max(0, Math.min(1, opts.confidence)) * 10);
  const recency = opts.ageDays <= 1 ? 5 : opts.ageDays <= 3 ? 3 : opts.ageDays <= 7 ? 2 : 1;
  const breakdown: ScoreBreakdown = {
    severity: sev,
    impact,
    urgency: urg,
    confidence: conf,
    recency,
  };
  const total = Math.min(100, sev + impact + urg + conf + recency);
  return { breakdown, total };
}

export function generateActions(opts: {
  report: IntelligenceReport;
  transactions: TxLite[];
  budgets: BudgetLite[];
  subscriptions: SubscriptionLite[];
  goals: GoalLite[];
  accounts?: AccountLite[];
}): PriorityAction[] {
  const { report, transactions, budgets, subscriptions, goals, accounts = [] } = opts;
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const actions: PriorityAction[] = [];

  // ---- normalization baseline ------------------------------------------------
  const last30Income = transactions
    .filter(t => t.type === 'income' && differenceInDays(today, parseISO(t.date)) <= 30)
    .reduce((s, t) => s + Number(t.amount), 0);
  const last30Expense = transactions
    .filter(t => t.type === 'expense' && differenceInDays(today, parseISO(t.date)) <= 30)
    .reduce((s, t) => s + Number(t.amount), 0);
  const incomeBaseline = last30Income > 0 ? last30Income : 3000;

  // 1. Anomalies
  for (const a of report.anomalies.slice(0, 12)) {
    const sev: ActionSeverity =
      a.severity === 'extreme' ? 'critical' : a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low';
    const ageDays = Math.max(0, differenceInDays(today, parseISO(a.date)));
    const conf = Math.min(1, Math.abs(a.zScore) / 6);
    const { breakdown, total } = computeScore({
      severity: sev, impact: a.amount, income: incomeBaseline,
      urgencyDays: 7 - ageDays, confidence: conf, ageDays,
    });
    actions.push({
      id: `anomaly-${a.id}`,
      category: 'anomaly',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: conf,
      urgencyDays: Math.max(0, 7 - ageDays),
      effortMinutes: 2,
      title: `Unusual spend: ${a.payee}`,
      description: a.reason,
      impact: a.amount,
      impactLabel: 'Transaction value',
      tags: ['outlier', a.payee?.toLowerCase() || 'unknown'],
      evidence: [
        { label: 'Z-score', value: a.zScore.toString() },
        { label: 'Expected range', value: `${a.expectedRange[0].toFixed(0)} – ${a.expectedRange[1].toFixed(0)}` },
        { label: 'Date', value: a.date },
        { label: 'Confidence', value: `${Math.round(conf * 100)}%` },
      ],
      cta: { label: 'Review transaction', intent: 'open_transaction', route: '/transactions', payload: { id: a.id } },
      secondaryActions: [{ label: 'Open analytics', intent: 'navigate', route: '/analytics' }],
      detectedAt: a.date,
    });
  }

  // 2. Recurring patterns not yet a Subscription
  const subNames = new Set(subscriptions.map(s => s.name.toLowerCase().trim()));
  for (const r of report.recurring) {
    if (r.confidence < 0.55) continue;
    if (subNames.has(r.payee.toLowerCase().trim())) continue;
    const sev: ActionSeverity = r.totalAnnualCost > 600 ? 'high' : r.totalAnnualCost > 200 ? 'medium' : 'low';
    const { breakdown, total } = computeScore({
      severity: sev, impact: r.totalAnnualCost, income: incomeBaseline * 12,
      urgencyDays: 30, confidence: r.confidence, ageDays: 1,
    });
    actions.push({
      id: `recurring-${r.signature}`,
      category: 'subscription',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: r.confidence,
      urgencyDays: 30,
      effortMinutes: 1,
      title: `Track "${r.payee}" as a subscription`,
      description: `Detected ${r.cadence} pattern across ${r.occurrences} payments — converting will surface it in your Subscriptions, alerts, and forecasts.`,
      impact: r.totalAnnualCost,
      impactLabel: 'Annual cost',
      tags: ['recurring', r.cadence],
      evidence: [
        { label: 'Cadence', value: r.cadence },
        { label: 'Avg amount', value: r.averageAmount.toFixed(2) },
        { label: 'Confidence', value: `${Math.round(r.confidence * 100)}%` },
        { label: 'Next predicted', value: r.nextPredictedDate },
      ],
      cta: { label: 'Add subscription', intent: 'create_subscription', payload: { name: r.payee, amount: r.averageAmount, next_due: r.nextPredictedDate, frequency: cadenceToFreq(r.cadence) } },
      secondaryActions: [{ label: 'View subscriptions', intent: 'navigate', route: '/subscriptions' }],
      detectedAt: todayISO,
    });
  }

  // 3. Budgets — over or near limit
  const month = todayISO.slice(0, 7);
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
    const dollarOver = Math.max(0, spent - b.amount);
    const daysLeftInMonth = 30 - new Date().getDate();
    const { breakdown, total } = computeScore({
      severity: sev, impact: over ? dollarOver : (b.amount - spent),
      income: incomeBaseline, urgencyDays: daysLeftInMonth,
      confidence: 1, ageDays: 0,
    });
    actions.push({
      id: `budget-${b.id}`,
      category: 'budget',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: 1,
      urgencyDays: daysLeftInMonth,
      effortMinutes: 3,
      title: over ? `Over budget: ${b.category?.name || 'Category'}` : `Approaching budget limit`,
      description: over
        ? `Spent ${Math.round(pct * 100)}% of your ${b.category?.name || ''} budget this month.`
        : `${Math.round(pct * 100)}% of ${b.category?.name || ''} budget used.`,
      impact: over ? dollarOver : b.amount - spent,
      impactLabel: over ? 'Over by' : 'Remaining',
      tags: ['budget', b.category?.name || 'category'],
      evidence: [
        { label: 'Budget', value: b.amount.toFixed(0) },
        { label: 'Spent', value: spent.toFixed(0) },
        { label: 'Utilization', value: `${Math.round(pct * 100)}%` },
        { label: 'Days left in month', value: daysLeftInMonth.toString() },
      ],
      cta: { label: 'Open budget', intent: 'navigate', route: '/budgets' },
      secondaryActions: [{ label: 'Reallocate', intent: 'navigate', route: '/budgets' }],
      detectedAt: todayISO,
    });
  }

  // 4. Subscriptions due within 7 days
  for (const s of subscriptions) {
    const daysUntil = differenceInDays(parseISO(s.next_due), today);
    if (daysUntil < -1 || daysUntil > 7) continue;
    const sev: ActionSeverity = daysUntil <= 0 ? 'high' : daysUntil <= 2 ? 'medium' : 'low';
    const { breakdown, total } = computeScore({
      severity: sev, impact: Number(s.amount), income: incomeBaseline,
      urgencyDays: daysUntil, confidence: 1, ageDays: 0,
    });
    actions.push({
      id: `bill-${s.id}`,
      category: 'bill',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: 1,
      urgencyDays: daysUntil,
      effortMinutes: 1,
      title: `${s.name} due ${daysUntil <= 0 ? (daysUntil === 0 ? 'today' : 'past due') : `in ${daysUntil}d`}`,
      description: `Charge of ${Number(s.amount).toFixed(2)} expected on ${s.next_due}.`,
      impact: Number(s.amount),
      impactLabel: 'Amount',
      tags: ['bill', s.name.toLowerCase()],
      evidence: [
        { label: 'Due date', value: s.next_due },
        { label: 'Amount', value: Number(s.amount).toFixed(2) },
        { label: 'Days until', value: daysUntil.toString() },
      ],
      cta: { label: 'View subscriptions', intent: 'navigate', route: '/subscriptions' },
      detectedAt: todayISO,
    });
  }

  // 5. Health score weakest dimensions (top 2)
  const dims = Object.entries(report.health.dimensions).sort((a, b) => a[1].score - b[1].score);
  for (const [key, dim] of dims.slice(0, 2)) {
    if (dim.score >= 60) continue;
    const sev: ActionSeverity = dim.score < 30 ? 'high' : 'medium';
    const { breakdown, total } = computeScore({
      severity: sev, impact: (60 - dim.score) * 10, income: incomeBaseline,
      urgencyDays: 30, confidence: 0.85, ageDays: 0,
    });
    actions.push({
      id: `health-${key}`,
      category: 'health',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: 0.85,
      urgencyDays: 30,
      effortMinutes: 5,
      title: `Boost ${humanize(key)}`,
      description: report.health.topRecommendation,
      impactLabel: 'Health gain',
      impact: Math.round((100 - dim.score) * dim.weight),
      tags: ['health', key],
      evidence: [
        { label: 'Current score', value: `${Math.round(dim.score)}/100` },
        { label: 'Weight', value: dim.weight.toFixed(2) },
        { label: 'Composite', value: `${report.health.composite}/100` },
      ],
      cta: { label: 'See health breakdown', intent: 'navigate', route: '/analytics' },
      detectedAt: todayISO,
    });
  }

  // 6. Forecast trajectory declining
  if (report.forecast.trend === 'declining' && report.forecast.trendStrength > 0.25) {
    const sev: ActionSeverity = report.forecast.trendStrength > 0.6 ? 'critical' : 'high';
    const { breakdown, total } = computeScore({
      severity: sev, impact: Math.abs(report.forecast.endOfMonthBalance),
      income: incomeBaseline, urgencyDays: 14,
      confidence: report.forecast.trendStrength, ageDays: 0,
    });
    actions.push({
      id: `forecast-decline`,
      category: 'forecast',
      severity: sev,
      priority: total,
      score: breakdown,
      confidence: report.forecast.trendStrength,
      urgencyDays: 14,
      effortMinutes: 5,
      title: '30-day cashflow trending down',
      description: `Forecast model projects an end-of-month balance change of ${report.forecast.endOfMonthBalance.toFixed(0)}.`,
      impact: report.forecast.endOfMonthBalance,
      impactLabel: 'Projected balance',
      tags: ['forecast', 'trend'],
      evidence: [
        { label: 'Trend strength (r²)', value: report.forecast.trendStrength.toFixed(2) },
        { label: 'Trajectory', value: report.forecast.trend },
      ],
      cta: { label: 'Open forecast', intent: 'navigate', route: '/analytics' },
      detectedAt: todayISO,
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
    if (last30Income > 0 && monthlyNeeded / last30Income > 0.25) {
      const sev: ActionSeverity = monthlyNeeded / last30Income > 0.5 ? 'high' : 'medium';
      const { breakdown, total } = computeScore({
        severity: sev, impact: monthlyNeeded, income: incomeBaseline,
        urgencyDays: Math.min(daysLeft, 30), confidence: 0.9, ageDays: 0,
      });
      actions.push({
        id: `goal-${g.id}`,
        category: 'goal',
        severity: sev,
        priority: total,
        score: breakdown,
        confidence: 0.9,
        urgencyDays: daysLeft,
        effortMinutes: 4,
        title: `Goal at risk: ${g.name}`,
        description: `Needs ~${monthlyNeeded.toFixed(0)}/mo to hit deadline — ${Math.round((monthlyNeeded / last30Income) * 100)}% of recent income.`,
        impact: remaining,
        impactLabel: 'Remaining',
        tags: ['goal', g.name.toLowerCase()],
        evidence: [
          { label: 'Days left', value: daysLeft.toString() },
          { label: 'Monthly needed', value: monthlyNeeded.toFixed(0) },
          { label: 'Progress', value: `${Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)}%` },
        ],
        cta: { label: 'Adjust goal', intent: 'navigate', route: '/goals' },
        detectedAt: todayISO,
      });
    }
  }

  // 8. Savings rate opportunity
  if (last30Income > 0) {
    const savingsRate = (last30Income - last30Expense) / last30Income;
    if (savingsRate < 0.15) {
      const sev: ActionSeverity = savingsRate < 0 ? 'critical' : savingsRate < 0.05 ? 'high' : 'medium';
      const target = last30Income * 0.2;
      const gap = target - (last30Income - last30Expense);
      const { breakdown, total } = computeScore({
        severity: sev, impact: gap, income: incomeBaseline,
        urgencyDays: 30, confidence: 0.95, ageDays: 0,
      });
      actions.push({
        id: 'savings-rate',
        category: 'savings',
        severity: sev,
        priority: total,
        score: breakdown,
        confidence: 0.95,
        urgencyDays: 30,
        effortMinutes: 10,
        title: `Savings rate ${Math.round(savingsRate * 100)}% — below 20% target`,
        description: `Trim ~${gap.toFixed(0)} from monthly spending to reach a healthy 20% savings rate.`,
        impact: gap,
        impactLabel: 'Monthly gap',
        tags: ['savings', 'rate'],
        evidence: [
          { label: '30d income', value: last30Income.toFixed(0) },
          { label: '30d expense', value: last30Expense.toFixed(0) },
          { label: 'Current rate', value: `${Math.round(savingsRate * 100)}%` },
          { label: 'Target', value: '20%' },
        ],
        cta: { label: 'Open budgets', intent: 'navigate', route: '/budgets' },
        secondaryActions: [{ label: 'View analytics', intent: 'navigate', route: '/analytics' }],
        detectedAt: todayISO,
      });
    }
  }

  // 9. Cash drag — large idle balance in non-investment accounts
  const idleCash = accounts
    .filter(a => a.type === 'bank' || a.type === 'cash' || a.type === 'wallet')
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const monthlyExpenseEstimate = Math.max(last30Expense, 500);
  const monthsOfRunway = idleCash / monthlyExpenseEstimate;
  if (monthsOfRunway > 9 && idleCash > 5000) {
    const investable = Math.max(0, idleCash - monthlyExpenseEstimate * 6);
    const { breakdown, total } = computeScore({
      severity: 'medium', impact: investable * 0.05, income: incomeBaseline,
      urgencyDays: 60, confidence: 0.7, ageDays: 0,
    });
    actions.push({
      id: 'cash-drag',
      category: 'cash',
      severity: 'medium',
      priority: total,
      score: breakdown,
      confidence: 0.7,
      urgencyDays: 60,
      effortMinutes: 15,
      title: 'Idle cash earning nothing',
      description: `~${investable.toFixed(0)} above 6mo emergency runway. Moving to a 5% HYSA could earn ~${(investable * 0.05).toFixed(0)}/yr.`,
      impact: investable * 0.05,
      impactLabel: 'Annual yield gap',
      tags: ['cash', 'investing'],
      evidence: [
        { label: 'Idle cash', value: idleCash.toFixed(0) },
        { label: 'Months of runway', value: monthsOfRunway.toFixed(1) },
        { label: 'Investable', value: investable.toFixed(0) },
      ],
      cta: { label: 'Open investments', intent: 'navigate', route: '/investments' },
      detectedAt: todayISO,
    });
  }

  // ---- apply persistence -----------------------------------------------------
  const dismissed = readDismissed();
  const snoozed = readSnoozed();
  const pinned = readPinned();
  const now = Date.now();

  return actions
    .filter(a => !dismissed.has(a.id))
    .filter(a => {
      const until = snoozed.get(a.id);
      return !until || until < now;
    })
    .map(a => pinned.has(a.id) ? { ...a, priority: Math.min(100, a.priority + 50) } : a)
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

// ============================================================================
// Persistence layer — dismissed / snoozed / pinned / history
// ============================================================================
const DISMISS_KEY = 'finflow:action-center:dismissed';
const SNOOZE_KEY = 'finflow:action-center:snoozed';
const PIN_KEY = 'finflow:action-center:pinned';
const HISTORY_KEY = 'finflow:action-center:history';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const obj = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const valid = Object.entries(obj).filter(([, ts]) => now - ts < DISMISS_TTL_MS);
    return new Set(valid.map(([id]) => id));
  } catch { return new Set(); }
}

export function readSnoozed(): Map<string, number> {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, number>;
    return new Map(Object.entries(obj));
  } catch { return new Map(); }
}

export function readPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch { return new Set(); }
}

export interface ActionHistoryEntry {
  id: string;
  category: ActionCategory;
  title: string;
  resolution: 'resolved' | 'dismissed' | 'snoozed';
  at: number;
  impact?: number;
}

export function readHistory(): ActionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActionHistoryEntry[];
  } catch { return []; }
}

function writeHistory(entries: ActionHistoryEntry[]) {
  try {
    // keep last 200
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-200)));
  } catch {}
}

export function logHistory(entry: ActionHistoryEntry) {
  const all = readHistory();
  all.push(entry);
  writeHistory(all);
}

export function dismissAction(id: string, action?: PriorityAction) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = Date.now();
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
    if (action) logHistory({ id, category: action.category, title: action.title, resolution: 'dismissed', at: Date.now(), impact: action.impact });
  } catch {}
}

export function undoDismiss(id: string) {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    delete obj[id];
    localStorage.setItem(DISMISS_KEY, JSON.stringify(obj));
  } catch {}
}

export function snoozeAction(id: string, hours = 24, action?: PriorityAction) {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[id] = Date.now() + hours * 3600 * 1000;
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(obj));
    if (action) logHistory({ id, category: action.category, title: action.title, resolution: 'snoozed', at: Date.now() });
  } catch {}
}

export function unsnoozeAction(id: string) {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    delete obj[id];
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(obj));
  } catch {}
}

export function togglePin(id: string) {
  try {
    const set = readPinned();
    if (set.has(id)) set.delete(id); else set.add(id);
    localStorage.setItem(PIN_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

export function resolveAction(action: PriorityAction) {
  dismissAction(action.id);
  logHistory({ id: action.id, category: action.category, title: action.title, resolution: 'resolved', at: Date.now(), impact: action.impact });
}

export function summarizeBySeverity(actions: PriorityAction[]) {
  const sum = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of actions) sum[a.severity]++;
  return sum;
}

export function summarizeByCategory(actions: PriorityAction[]): Record<ActionCategory, number> {
  const out: Record<string, number> = {};
  for (const a of actions) out[a.category] = (out[a.category] || 0) + 1;
  return out as Record<ActionCategory, number>;
}

export function totalEffortMinutes(actions: PriorityAction[]): number {
  return actions.reduce((s, a) => s + a.effortMinutes, 0);
}

export function totalImpact(actions: PriorityAction[]): number {
  return actions.reduce((s, a) => s + (a.impact && a.impact > 0 ? a.impact : 0), 0);
}

export type SortKey = 'priority' | 'impact' | 'recent' | 'confidence' | 'urgency';

export function sortActions(actions: PriorityAction[], sort: SortKey): PriorityAction[] {
  const copy = [...actions];
  switch (sort) {
    case 'impact':
      return copy.sort((a, b) => Math.abs(b.impact || 0) - Math.abs(a.impact || 0));
    case 'recent':
      return copy.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
    case 'confidence':
      return copy.sort((a, b) => b.confidence - a.confidence);
    case 'urgency':
      return copy.sort((a, b) => (a.urgencyDays ?? 999) - (b.urgencyDays ?? 999));
    default:
      return copy.sort((a, b) => b.priority - a.priority);
  }
}

export function searchActions(actions: PriorityAction[], q: string): PriorityAction[] {
  if (!q.trim()) return actions;
  const needle = q.toLowerCase();
  return actions.filter(a =>
    a.title.toLowerCase().includes(needle) ||
    a.description.toLowerCase().includes(needle) ||
    a.tags.some(t => t.includes(needle)) ||
    a.category.includes(needle)
  );
}

export type GroupKey = 'none' | 'category' | 'severity';

export function groupActions(actions: PriorityAction[], group: GroupKey): { key: string; items: PriorityAction[] }[] {
  if (group === 'none') return [{ key: 'All', items: actions }];
  const map = new Map<string, PriorityAction[]>();
  for (const a of actions) {
    const k = group === 'category' ? a.category : a.severity;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(a);
  }
  const order = group === 'severity' ? ['critical', 'high', 'medium', 'low'] : Array.from(map.keys());
  return order
    .filter(k => map.has(k))
    .map(k => ({ key: k, items: map.get(k)! }));
}
