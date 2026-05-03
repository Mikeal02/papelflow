import { parseISO, format, addDays, startOfMonth, differenceInDays } from 'date-fns';
import { ema, linearRegression, welford, percentile } from './statistics';

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
  burnRate: number; // avg net daily
  runwayDays: number | null;
  trend: 'improving' | 'declining' | 'stable';
  trendStrength: number; // r²
}

/**
 * Hybrid cashflow forecast:
 *  1. Aggregates daily net (income - expense) over last 90d
 *  2. Decomposes into trend (linear regression) + level (EMA)
 *  3. Runs 1,000-iteration Monte Carlo using residual distribution for confidence bands
 */
export function forecastCashflow(
  txs: Tx[],
  currentBalance: number,
  horizonDays = 30,
  iterations = 1000
): CashflowForecast {
  const today = new Date();
  const start = addDays(today, -90);

  // Bucket daily net
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

  const { slope, intercept, r2 } = linearRegression(series);
  const smoothed = ema(series, 0.2);
  const baseline = smoothed[smoothed.length - 1] || 0;

  // Residuals for Monte Carlo
  const residuals = series.map((v, i) => v - (slope * i + intercept));
  const { stdev: resStdev } = welford(residuals);

  // Generate Monte Carlo trajectories
  const finalBalances: number[] = [];
  const dailyP50: number[] = new Array(horizonDays).fill(0);
  const dailyLower: number[] = new Array(horizonDays).fill(0);
  const dailyUpper: number[] = new Array(horizonDays).fill(0);
  const trajectories: number[][] = [];

  for (let it = 0; it < iterations; it++) {
    let bal = currentBalance;
    const path: number[] = [];
    for (let d = 0; d < horizonDays; d++) {
      const trend = baseline + slope * d * 0.3; // dampened forward trend
      const shock = gaussian() * resStdev;
      bal += trend + shock;
      path.push(bal);
    }
    trajectories.push(path);
    finalBalances.push(bal);
  }

  // Percentile aggregation per day
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
  if (slope > 1 && r2 > 0.1) trend = 'improving';
  else if (slope < -1 && r2 > 0.1) trend = 'declining';

  return {
    daily,
    endOfMonthBalance: percentile(finalBalances, 0.5),
    endOfMonthLower: percentile(finalBalances, 0.1),
    endOfMonthUpper: percentile(finalBalances, 0.9),
    burnRate,
    runwayDays,
    trend,
    trendStrength: r2,
  };
}

/** Box-Muller standard normal sample. */
function gaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
