import { parseISO, format, addDays } from 'date-fns';
import { ema, linearRegression, welford, percentile, hampelFilter, holtLinear } from './statistics';
import type { AlgorithmExplanation } from './explanations';

interface Tx {
  amount: number | string;
  date: string;
  type: string;
}

export interface CashflowForecast {
  daily: { date: string; predicted: number; lower: number; upper: number }[];
  endOfMonthBalance: number;
  endOfMonthLower: number;
  endOfMonthUpper: number;
  burnRate: number;
  runwayDays: number | null;
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number;
  explanation: AlgorithmExplanation;
}

/**
 * Elite cashflow forecast:
 *  1. Aggregate daily net (income - expense) over last 90d
 *  2. Hampel filter neutralizes one-off spikes that would skew regression
 *  3. Holt linear smoothing extracts level + trend (more robust than pure OLS)
 *  4. Linear regression provides r² and slope for direction confidence
 *  5. Monte Carlo (default 1,000 iters) using residual stdev → 10/50/90 bands
 */
export function forecastCashflow(
  txs: Tx[],
  currentBalance: number,
  horizonDays = 30,
  iterations = 1000
): CashflowForecast {
  const today = new Date();
  const start = addDays(today, -90);

  const netByDay = new Map<string, number>();
  for (const t of txs) {
    const d = parseISO(t.date);
    if (d < start || d > today) continue;
    const key = format(d, 'yyyy-MM-dd');
    const sign = t.type === 'income' ? 1 : t.type === 'expense' ? -1 : 0;
    netByDay.set(key, (netByDay.get(key) || 0) + sign * Number(t.amount));
  }

  const series: number[] = [];
  for (let i = 90; i >= 0; i--) {
    const k = format(addDays(today, -i), 'yyyy-MM-dd');
    series.push(netByDay.get(k) || 0);
  }

  // Hampel filter for clean trend extraction
  const { cleaned, outlierIndices } = hampelFilter(series, 7, 3);

  const { slope, intercept, r2 } = linearRegression(cleaned);
  const { level: hwLevel, trend: hwTrend } = holtLinear(cleaned, 0.4, 0.2);
  const smoothed = ema(cleaned, 0.2);
  // Blend Holt level with EMA for stability
  const baseline = 0.6 * hwLevel + 0.4 * (smoothed[smoothed.length - 1] || 0);
  const driftPerDay = 0.7 * hwTrend + 0.3 * slope;

  const residuals = cleaned.map((v, i) => v - (slope * i + intercept));
  const { stdev: resStdev } = welford(residuals);

  const finalBalances: number[] = [];
  const dailyP50: number[] = new Array(horizonDays).fill(0);
  const dailyLower: number[] = new Array(horizonDays).fill(0);
  const dailyUpper: number[] = new Array(horizonDays).fill(0);
  const trajectories: number[][] = [];

  for (let it = 0; it < iterations; it++) {
    let bal = currentBalance;
    const path: number[] = [];
    for (let d = 0; d < horizonDays; d++) {
      const drift = baseline + driftPerDay * d * 0.3;
      const shock = gaussian() * resStdev;
      bal += drift + shock;
      path.push(bal);
    }
    trajectories.push(path);
    finalBalances.push(bal);
  }

  for (let d = 0; d < horizonDays; d++) {
    const slice = trajectories.map(p => p[d]);
    dailyP50[d] = percentile(slice, 0.5);
    dailyLower[d] = percentile(slice, 0.1);
    dailyUpper[d] = percentile(slice, 0.9);
  }

  const daily = dailyP50.map((p, i) => ({
    date: format(addDays(today, i + 1), 'yyyy-MM-dd'),
    predicted: p,
    lower: dailyLower[i],
    upper: dailyUpper[i],
  }));

  const burnRate = baseline;
  const runwayDays = burnRate < 0 ? Math.max(0, Math.floor(currentBalance / -burnRate)) : null;

  let trend: CashflowForecast['trend'] = 'stable';
  if (driftPerDay > 1 && r2 > 0.1) trend = 'improving';
  else if (driftPerDay < -1 && r2 > 0.1) trend = 'declining';

  const eomP50 = percentile(finalBalances, 0.5);
  const eomLower = percentile(finalBalances, 0.1);
  const eomUpper = percentile(finalBalances, 0.9);

  const explanation: AlgorithmExplanation = {
    algorithm: 'Cashflow Forecast',
    summary: `30-day projected balance ${eomP50.toFixed(0)} (80% CI ${eomLower.toFixed(0)} → ${eomUpper.toFixed(0)}). Trend: ${trend} (r²=${r2.toFixed(2)}).`,
    method: 'Hampel-cleaned series → Holt linear smoothing + OLS → Monte Carlo with Gaussian shocks',
    formula: 'baseline = 0.6·HoltLevel + 0.4·EMA · drift = 0.7·HoltTrend + 0.3·slope · path[d] = bal + drift·d + N(0,σ_residual)',
    features: [
      { name: 'Holt level', value: hwLevel.toFixed(2), description: 'Smoothed current daily net flow.' },
      { name: 'Holt trend', value: hwTrend.toFixed(3), description: 'Drift per day extracted by double-exponential smoothing.' },
      { name: 'OLS slope', value: slope.toFixed(3), description: 'Linear regression slope on cleaned series.' },
      { name: 'OLS r²', value: r2.toFixed(3), description: 'Variance explained by the trend line.', contribution: r2 },
      { name: 'Residual σ', value: resStdev.toFixed(2), description: 'Stdev of regression residuals — drives Monte Carlo shock width.' },
      { name: 'Hampel outliers removed', value: outlierIndices.length, description: 'One-off spikes neutralized before fitting trend.' },
      { name: 'Monte Carlo iterations', value: iterations, description: 'Independent forward simulations.' },
    ],
    evidence: [],
    diagnostics: [
      { label: 'Series length', value: `${series.length} days` },
      { label: 'Burn rate', value: `${burnRate.toFixed(2)}/day` },
      { label: 'Runway', value: runwayDays === null ? '∞ (positive)' : `${runwayDays} days` },
    ],
    confidence: Math.min(1, 0.5 + r2 * 0.5),
  };

  return {
    daily,
    endOfMonthBalance: eomP50,
    endOfMonthLower: eomLower,
    endOfMonthUpper: eomUpper,
    burnRate,
    runwayDays,
    trend,
    trendStrength: r2,
    explanation,
  };
}

function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
