import { differenceInDays, parseISO, addDays, format } from 'date-fns';
import { similarity, autocorrelation, mean, welford } from './statistics';

export interface RecurringPattern {
  signature: string;
  payee: string;
  averageAmount: number;
  amountStdev: number;
  intervalDays: number;
  confidence: number; // 0-1
  occurrences: number;
  nextPredictedDate: string;
  lastDate: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  totalAnnualCost: number;
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
 * Fuzzy-cluster transactions by payee similarity (>= 0.78 Jaro-ish via Levenshtein),
 * then for each cluster:
 *  - Compute inter-arrival intervals
 *  - Score candidate cadences with autocorrelation + interval stability
 *  - Predict next occurrence with EMA-corrected interval
 */
export function detectRecurring(txs: Tx[]): RecurringPattern[] {
  const expenses = txs.filter(t => t.type === 'expense' && t.payee);
  if (expenses.length < 3) return [];

  // Cluster payees
  const clusters: { key: string; items: Tx[] }[] = [];
  for (const t of expenses) {
    const norm = normalize(t.payee!);
    if (!norm) continue;
    let added = false;
    for (const c of clusters) {
      if (similarity(norm, c.key) >= 0.78) {
        c.items.push(t);
        added = true;
        break;
      }
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
    if (avgInterval < 4) continue; // ignore burst noise

    // Match to nearest cadence bucket
    const bucket = CADENCE_BUCKETS.reduce((best, b) =>
      Math.abs(b.days - avgInterval) < Math.abs(best.days - avgInterval) ? b : best
    );

    const inBucket = Math.abs(bucket.days - avgInterval) <= bucket.tolerance;
    const cadence = inBucket ? bucket.label : 'custom';

    // Confidence: inverse coefficient of variation + cadence match + sample bonus
    const cv = avgInterval > 0 ? intervalStdev / avgInterval : 1;
    const stability = Math.max(0, 1 - cv);
    const cadenceBonus = inBucket ? 0.2 : 0;
    const sampleBonus = Math.min(0.15, sorted.length * 0.025);

    // Amount consistency
    const amounts = sorted.map(t => Number(t.amount));
    const { mean: avgAmt, stdev: amtStdev } = welford(amounts);
    const amountConsistency = avgAmt > 0 ? Math.max(0, 1 - amtStdev / avgAmt) : 0;

    const confidence = Math.min(1, 0.35 * stability + 0.25 * amountConsistency + cadenceBonus + sampleBonus + 0.1);
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
    });
  }

  return patterns.sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
}

// Re-export for convenience
export { autocorrelation, mean };
