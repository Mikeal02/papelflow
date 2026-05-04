import { parseISO, differenceInDays } from 'date-fns';
import { welford, mean, linearRegression } from './statistics';
import type { AlgorithmExplanation } from './explanations';

interface Tx { id?: string; amount: number | string; date: string; type: string; payee?: string | null; category?: { name?: string } | null; }
interface Account { balance: number | string; type: string; }
interface Goal { current_amount: number | string; target_amount: number | string; name?: string | null; }

export interface HealthScore {
  composite: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: {
    savingsRate: { score: number; value: number; weight: number };
    cashflowStability: { score: number; value: number; weight: number };
    emergencyBuffer: { score: number; value: number; weight: number };
    debtBurden: { score: number; value: number; weight: number };
    goalProgress: { score: number; value: number; weight: number };
    spendingDiscipline: { score: number; value: number; weight: number };
  };
  trajectory: 'improving' | 'declining' | 'stable';
  topRecommendation: string;
  explanation: AlgorithmExplanation;
}

/**
 * Multi-dimensional financial health score (0-100), inspired by FICO + CFPB Financial Well-Being Scale.
 * Each dimension is independently scored, then combined with explicit weights so users see exactly
 * which lever moves the composite.
 */
export function computeHealthScore(txs: Tx[], accounts: Account[], goals: Goal[]): HealthScore {
  const today = new Date();
  const last30 = txs.filter(t => differenceInDays(today, parseISO(t.date)) <= 30);
  const last90 = txs.filter(t => differenceInDays(today, parseISO(t.date)) <= 90);

  const income30 = sum(last30.filter(t => t.type === 'income').map(t => Number(t.amount)));
  const expense30 = sum(last30.filter(t => t.type === 'expense').map(t => Number(t.amount)));
  const savings = income30 - expense30;
  const savingsRate = income30 > 0 ? savings / income30 : 0;

  const dSavings = clampScore(savingsRate * 500);

  const weeklyBuckets = bucketByWeek(last90);
  const { mean: m, stdev: sd } = welford(weeklyBuckets);
  const cv = m !== 0 ? Math.abs(sd / m) : 1;
  const dStability = clampScore(100 - cv * 60);

  const liquidBalance = sum(accounts.filter(a => ['cash', 'bank', 'wallet'].includes(a.type)).map(a => Number(a.balance)));
  const monthlyExpense = expense30 || 1;
  const months = liquidBalance / monthlyExpense;
  const dBuffer = clampScore((months / 6) * 100);

  const debt = Math.abs(sum(accounts.filter(a => ['credit_card', 'loan'].includes(a.type)).map(a => Number(a.balance))));
  const debtRatio = liquidBalance > 0 ? debt / liquidBalance : (debt > 0 ? 2 : 0);
  const dDebt = clampScore(100 - debtRatio * 50);

  const goalScore = goals.length === 0 ? 50 : mean(goals.map(g => {
    const t = Number(g.target_amount); const c = Number(g.current_amount);
    return t > 0 ? Math.min(100, (c / t) * 100) : 0;
  }));

  const dailyExpense = bucketByDay(last90, 'expense');
  const { slope, r2 } = linearRegression(dailyExpense);
  const dDiscipline = clampScore(50 - slope * 5 * (r2 > 0.1 ? 1 : 0.3));

  const dims = {
    savingsRate:       { score: dSavings,    value: savingsRate * 100, weight: 0.25 },
    cashflowStability: { score: dStability,  value: cv,                weight: 0.15 },
    emergencyBuffer:   { score: dBuffer,     value: months,            weight: 0.20 },
    debtBurden:        { score: dDebt,       value: debtRatio,         weight: 0.15 },
    goalProgress:      { score: goalScore,   value: goalScore,         weight: 0.10 },
    spendingDiscipline:{ score: dDiscipline, value: slope,             weight: 0.15 },
  };

  const composite = Object.values(dims).reduce((s, d) => s + d.score * d.weight, 0);

  const prior30 = txs.filter(t => {
    const d = differenceInDays(today, parseISO(t.date));
    return d > 30 && d <= 60;
  });
  const pi = sum(prior30.filter(t => t.type === 'income').map(t => Number(t.amount)));
  const pe = sum(prior30.filter(t => t.type === 'expense').map(t => Number(t.amount)));
  const priorRate = pi > 0 ? (pi - pe) / pi : 0;
  const delta = savingsRate - priorRate;
  let trajectory: HealthScore['trajectory'] = 'stable';
  if (delta > 0.03) trajectory = 'improving';
  else if (delta < -0.03) trajectory = 'declining';

  const recMap: Record<string, string> = {
    savingsRate: 'Increase savings rate — try the 50/30/20 rule.',
    cashflowStability: 'Smooth cashflow with a sinking fund for irregular bills.',
    emergencyBuffer: 'Build an emergency fund of 3-6 months of expenses.',
    debtBurden: 'Prioritize debt payoff using the avalanche method.',
    goalProgress: 'Set up automatic contributions to your goals.',
    spendingDiscipline: 'Spending is trending up — review your top categories.',
  };
  const sortedDims = Object.entries(dims).sort((a, b) => a[1].score - b[1].score);
  const weakest = sortedDims[0];

  // Top contributing expenses to the weakest dimension (rough but actionable)
  const weakKey = weakest[0];
  const evidence = (() => {
    if (weakKey === 'savingsRate' || weakKey === 'spendingDiscipline' || weakKey === 'cashflowStability') {
      return [...last30.filter(t => t.type === 'expense')]
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 5)
        .map(t => ({
          id: t.id, date: t.date, payee: t.payee || 'Unknown', amount: Number(t.amount),
          reason: `Top expense impacting ${weakKey}`,
          weight: 0.5,
        }));
    }
    return [];
  })();

  const explanation: AlgorithmExplanation = {
    algorithm: 'Financial Health Score',
    summary: `Composite ${Math.round(composite)}/100 (Grade ${gradeFor(composite)}). Trajectory: ${trajectory}. Weakest lever: ${weakKey} at ${Math.round(weakest[1].score)}/100.`,
    method: 'Weighted multi-dimensional scoring (savings, stability, buffer, debt, goals, discipline)',
    formula: 'composite = Σ score_i · weight_i',
    features: Object.entries(dims).map(([k, d]) => ({
      name: k.replace(/([A-Z])/g, ' $1').trim(),
      value: `${Math.round(d.score)}/100`,
      weight: d.weight,
      contribution: d.score * d.weight,
      description: dimensionDescription(k, d.value),
    })),
    evidence,
    diagnostics: [
      { label: 'Income (30d)', value: income30.toFixed(0) },
      { label: 'Expense (30d)', value: expense30.toFixed(0) },
      { label: 'Liquid balance', value: liquidBalance.toFixed(0) },
      { label: 'Debt balance', value: debt.toFixed(0) },
      { label: 'Δ savings rate vs prior month', value: `${(delta * 100).toFixed(1)}%` },
    ],
    confidence: Math.min(1, last90.length / 60),
  };

  return {
    composite: Math.round(composite),
    grade: gradeFor(composite),
    dimensions: dims,
    trajectory,
    topRecommendation: recMap[weakest[0]] || 'Keep going — your habits are solid.',
    explanation,
  };
}

function dimensionDescription(k: string, v: number): string {
  switch (k) {
    case 'savingsRate': return `${v.toFixed(1)}% of income saved (target ≥20%).`;
    case 'cashflowStability': return `Coefficient of variation ${v.toFixed(2)} (lower = steadier).`;
    case 'emergencyBuffer': return `${v.toFixed(1)} months of expenses in liquid accounts (target ≥6).`;
    case 'debtBurden': return `Debt is ${v.toFixed(2)}× liquid balance (target ≤0.5).`;
    case 'goalProgress': return `Average goal completion ${v.toFixed(0)}%.`;
    case 'spendingDiscipline': return `Daily expense slope ${v.toFixed(2)} (negative = improving).`;
    default: return '';
  }
}

function sum(xs: number[]): number { return xs.reduce((a, b) => a + b, 0); }
function clampScore(x: number): number { return Math.max(0, Math.min(100, x)); }
function gradeFor(s: number): HealthScore['grade'] {
  if (s >= 90) return 'A+'; if (s >= 80) return 'A'; if (s >= 70) return 'B';
  if (s >= 60) return 'C'; if (s >= 50) return 'D'; return 'F';
}
function bucketByWeek(txs: Tx[]): number[] {
  const map = new Map<number, number>();
  const today = new Date();
  for (const t of txs) {
    const week = Math.floor(differenceInDays(today, parseISO(t.date)) / 7);
    const sign = t.type === 'income' ? 1 : t.type === 'expense' ? -1 : 0;
    map.set(week, (map.get(week) || 0) + sign * Number(t.amount));
  }
  return Array.from(map.values());
}
function bucketByDay(txs: Tx[], type: string): number[] {
  const map = new Map<number, number>();
  const today = new Date();
  for (const t of txs.filter(x => x.type === type)) {
    const day = differenceInDays(today, parseISO(t.date));
    map.set(day, (map.get(day) || 0) + Number(t.amount));
  }
  const out: number[] = [];
  for (let i = 89; i >= 0; i--) out.push(map.get(i) || 0);
  return out;
}
