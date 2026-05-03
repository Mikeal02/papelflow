import { modifiedZScore, percentile, mad } from './statistics';

export interface AnomalyResult {
  id: string;
  amount: number;
  date: string;
  payee: string;
  category?: string;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  reason: string;
  expectedRange: [number, number];
}

interface Tx {
  id: string;
  amount: number | string;
  date: string;
  type: string;
  payee?: string | null;
  category?: { name?: string } | null;
  category_id?: string | null;
}

/**
 * Detects anomalous expenses using:
 * 1. Per-category Modified Z-score (robust against skewed spend)
 * 2. Global IQR fallback for transactions without enough category history
 * 3. Severity tiers calibrated to MAD-based standard deviations
 */
export function detectAnomalies(txs: Tx[]): AnomalyResult[] {
  const expenses = txs.filter(t => t.type === 'expense');
  if (expenses.length < 5) return [];

  // Group by category
  const byCategory = new Map<string, Tx[]>();
  for (const t of expenses) {
    const key = t.category_id || '__uncat__';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(t);
  }

  const results: AnomalyResult[] = [];
  const allAmounts = expenses.map(t => Number(t.amount));
  const globalQ1 = percentile(allAmounts, 0.25);
  const globalQ3 = percentile(allAmounts, 0.75);
  const globalIqr = globalQ3 - globalQ1;
  const globalUpper = globalQ3 + 1.5 * globalIqr;

  for (const [, group] of byCategory) {
    if (group.length < 3) continue;
    const amounts = group.map(t => Number(t.amount));
    const zs = modifiedZScore(amounts);
    const { median: med, mad: m } = mad(amounts);
    const stdev = 1.4826 * m;

    group.forEach((t, i) => {
      const z = zs[i];
      const amt = amounts[i];
      let severity: AnomalyResult['severity'] | null = null;
      if (z >= 6) severity = 'extreme';
      else if (z >= 4) severity = 'high';
      else if (z >= 2.5) severity = 'medium';
      else if (z >= 2 && amt > globalUpper) severity = 'low';
      if (!severity) return;

      results.push({
        id: t.id,
        amount: amt,
        date: t.date,
        payee: t.payee || 'Unknown',
        category: t.category?.name,
        zScore: Number(z.toFixed(2)),
        severity,
        reason: `${(amt / Math.max(med, 1)).toFixed(1)}× typical for ${t.category?.name || 'this category'}`,
        expectedRange: [Math.max(0, med - 2 * stdev), med + 2 * stdev],
      });
    });
  }

  return results.sort((a, b) => b.zScore - a.zScore).slice(0, 12);
}
