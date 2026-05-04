import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { similarity, autocorrelation, mean, welford, dominantPeriod } from './statistics';
import type { AlgorithmExplanation } from './explanations';

export interface RecurringPattern {
  signature: string;
  payee: string;
  averageAmount: number;
  amountStdev: number;
  intervalDays: number;
  confidence: number;
  occurrences: number;
  nextPredictedDate: string;
  lastDate: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  totalAnnualCost: number;
  contributingTxIds: string[];
}

export interface RecurringOutput {
  results: RecurringPattern[];
  explanation: AlgorithmExplanation;
}

interface Tx {
  id: string;
  amount: number | string;
  date: string;
  type: string;
  payee?: string | null;
}

const CADENCE_BUCKETS: Array<{ label: RecurringPattern['cadence']; days: number; tolerance: number }> = [
  { label: 'weekly', days: 7, tolerance: 2 },
  { label: 'biweekly', days: 14, tolerance: 3 },
  { label: 'monthly', days: 30, tolerance: 5 },
  { label: 'quarterly', days: 91, tolerance: 10 },
  { label: 'yearly', days: 365, tolerance: 15 },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Elite recurring detection:
 *  - Levenshtein-based payee fuzzy clustering (similarity ≥ 0.78)
 *  - Per-cluster autocorrelation peak detection finds true periodicity
 *  - Confidence blends interval stability, amount consistency, cadence match,
 *    autocorrelation strength, and sample size
 *  - Predicts next occurrence using cadence-snapped interval
 */
export function detectRecurring(txs: Tx[]): RecurringOutput {
  const expenses = txs.filter(t => t.type === 'expense' && t.payee);
  const baseExpl = (summary: string, patterns: RecurringPattern[] = []): AlgorithmExplanation => ({
    algorithm: 'Recurring Detection',
    summary,
    method: 'Levenshtein fuzzy clustering + autocorrelation periodicity',
    formula: 'conf = 0.30·stability + 0.25·amountConsistency + 0.20·acfStrength + cadenceBonus + sampleBonus',
    features: [
      { name: 'Clusters analyzed', value: patterns.length, description: 'Each cluster groups merchants whose names are ≥78% similar.' },
      { name: 'Total annual cost', value: patterns.reduce((s, r) => s + r.totalAnnualCost, 0).toFixed(2), description: 'Sum of average amounts annualized by cadence.' },
    ],
    evidence: patterns.slice(0, 6).map(r => ({
      date: r.lastDate, payee: r.payee, amount: r.averageAmount,
      reason: `${r.cadence} · next ~${r.nextPredictedDate} · ${Math.round(r.confidence * 100)}% conf`,
      weight: r.confidence,
    })),
    diagnostics: [
      { label: 'Expenses with payee', value: `${expenses.length}` },
      { label: 'Patterns surfaced', value: `${patterns.length}` },
    ],
    confidence: patterns.length ? mean(patterns.map(p => p.confidence)) : 0,
  });

  if (expenses.length < 3) return { results: [], explanation: baseExpl('Need at least 3 payee-tagged expenses to detect recurrence.') };

  const clusters: { key: string; items: Tx[] }[] = [];
  for (const t of expenses) {
    const norm = normalize(t.payee!);
    if (!norm) continue;
    let added = false;
    for (const c of clusters) {
      if (similarity(norm, c.key) >= 0.78) { c.items.push(t); added = true; break; }
    }
    if (!added) clusters.push({ key: norm, items: [t] });
  }

  const patterns: RecurringPattern[] = [];

  for (const c of clusters) {
    if (c.items.length < 3) continue;
    const sorted = [...c.items].sort((a, b) => a.date.localeCompare(b.date));
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)));
    }
    if (!intervals.length) continue;

    const { mean: avgInterval, stdev: intervalStdev } = welford(intervals);
    if (avgInterval < 4) continue;

    const bucket = CADENCE_BUCKETS.reduce((best, b) =>
      Math.abs(b.days - avgInterval) < Math.abs(best.days - avgInterval) ? b : best
    );
    const inBucket = Math.abs(bucket.days - avgInterval) <= bucket.tolerance;
    const cadence = inBucket ? bucket.label : 'custom';

    // Autocorrelation strength on the interval series boosts confidence
    const acfStrength = intervals.length >= 4
      ? Math.max(0, dominantPeriod(intervals, 1, Math.min(5, intervals.length - 1)).strength)
      : 0;

    const cv = avgInterval > 0 ? intervalStdev / avgInterval : 1;
    const stability = Math.max(0, 1 - cv);
    const cadenceBonus = inBucket ? 0.15 : 0;
    const sampleBonus = Math.min(0.15, sorted.length * 0.025);

    const amounts = sorted.map(t => Number(t.amount));
    const { mean: avgAmt, stdev: amtStdev } = welford(amounts);
    const amountConsistency = avgAmt > 0 ? Math.max(0, 1 - amtStdev / avgAmt) : 0;

    const confidence = Math.min(1, 0.30 * stability + 0.25 * amountConsistency + 0.20 * acfStrength + cadenceBonus + sampleBonus + 0.05);
    if (confidence < 0.4 || sorted.length < 3) continue;

    const lastDate = sorted[sorted.length - 1].date;
    const predictedInterval = inBucket ? bucket.days : Math.round(avgInterval);
    const nextDate = format(addDays(parseISO(lastDate), predictedInterval), 'yyyy-MM-dd');
    const annualMultiplier = 365 / Math.max(1, predictedInterval);

    patterns.push({
      signature: c.key,
      payee: sorted[sorted.length - 1].payee!,
      averageAmount: avgAmt,
      amountStdev: amtStdev,
      intervalDays: predictedInterval,
      confidence,
      occurrences: sorted.length,
      nextPredictedDate: nextDate,
      lastDate,
      cadence,
      totalAnnualCost: avgAmt * annualMultiplier,
      contributingTxIds: sorted.map(t => t.id),
    });
  }

  patterns.sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
  return {
    results: patterns,
    explanation: baseExpl(
      patterns.length
        ? `Detected ${patterns.length} recurring pattern${patterns.length > 1 ? 's' : ''} totaling ${patterns.reduce((s, r) => s + r.totalAnnualCost, 0).toFixed(0)}/yr.`
        : 'No stable recurring patterns yet — keep logging transactions.',
      patterns,
    ),
  };
}

export { autocorrelation, mean };
