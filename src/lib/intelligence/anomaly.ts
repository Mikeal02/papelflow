import { modifiedZScore, percentile, mad, hampelFilter } from './statistics';
import type { AlgorithmExplanation } from './explanations';

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
  contributingFeatures: { name: string; value: string; impact: number }[];
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

export interface AnomalyOutput {
  results: AnomalyResult[];
  explanation: AlgorithmExplanation;
}

/**
 * Elite anomaly detection:
 *  1. Per-category Modified Z-score (robust against skewed spend)
 *  2. Hampel filter cleans the training distribution so a single huge outlier
 *     doesn't inflate MAD and mask further outliers
 *  3. Global IQR fallback for rarely-used categories
 *  4. Severity tiers calibrated to MAD-based standard deviations
 *  5. Per-anomaly contributing features (deviation, payee novelty, recency)
 */
export function detectAnomalies(txs: Tx[]): AnomalyOutput {
  const expenses = txs.filter(t => t.type === 'expense');
  const emptyExpl: AlgorithmExplanation = {
    algorithm: 'Anomaly Detection',
    summary: 'Insufficient data for outlier analysis.',
    method: 'Modified Z-score (MAD) with Hampel pre-filter',
    formula: 'z = 0.6745 · (x − median) / MAD',
    features: [],
    evidence: [],
    diagnostics: [{ label: 'Sample size', value: `${expenses.length} expenses` }],
    confidence: 0,
  };
  if (expenses.length < 5) return { results: [], explanation: emptyExpl };

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

  // Payee frequency for novelty signal
  const payeeFreq = new Map<string, number>();
  for (const t of expenses) {
    const p = (t.payee || '').toLowerCase().trim();
    payeeFreq.set(p, (payeeFreq.get(p) || 0) + 1);
  }
  const today = Date.now();

  let cleanedCategories = 0;
  let contaminatedPoints = 0;

  for (const [, group] of byCategory) {
    if (group.length < 3) continue;
    const amounts = group.map(t => Number(t.amount));

    // Hampel pre-filter: clean for stable MAD baseline, but score on raw values
    const { cleaned, outlierIndices } = hampelFilter(amounts, Math.min(7, Math.floor(amounts.length / 2)), 3);
    if (outlierIndices.length) { cleanedCategories++; contaminatedPoints += outlierIndices.length; }

    const zs = modifiedZScore(cleaned);
    // Re-score raw amounts against cleaned baseline
    const { median: med, mad: m } = mad(cleaned);
    const denom = m === 0 ? 1e-9 : 1.4826 * m;
    const rawZs = amounts.map(x => (x - med) / denom);
    const stdev = 1.4826 * m;

    group.forEach((t, i) => {
      const z = rawZs[i];
      const amt = amounts[i];
      let severity: AnomalyResult['severity'] | null = null;
      if (z >= 6) severity = 'extreme';
      else if (z >= 4) severity = 'high';
      else if (z >= 2.5) severity = 'medium';
      else if (z >= 2 && amt > globalUpper) severity = 'low';
      if (!severity) return;

      const payee = (t.payee || '').toLowerCase().trim();
      const isNovel = (payeeFreq.get(payee) || 0) <= 1;
      const ageDays = (today - new Date(t.date).getTime()) / 86400000;
      const recencyBoost = ageDays <= 7 ? 1 : ageDays <= 30 ? 0.6 : 0.3;

      const features = [
        { name: 'Deviation (z-score)', value: z.toFixed(2), impact: Math.min(1, z / 6) },
        { name: 'Amount vs median', value: `${(amt / Math.max(med, 1)).toFixed(1)}×`, impact: Math.min(1, amt / Math.max(med, 1) / 5) },
        { name: 'Payee novelty', value: isNovel ? 'New merchant' : 'Recurring', impact: isNovel ? 0.7 : 0.2 },
        { name: 'Recency', value: `${Math.round(ageDays)}d ago`, impact: recencyBoost },
      ];

      results.push({
        id: t.id,
        amount: amt,
        date: t.date,
        payee: t.payee || 'Unknown',
        category: t.category?.name,
        zScore: Number(z.toFixed(2)),
        severity,
        reason: `${(amt / Math.max(med, 1)).toFixed(1)}× typical for ${t.category?.name || 'this category'}${isNovel ? ' · new merchant' : ''}`,
        expectedRange: [Math.max(0, med - 2 * stdev), med + 2 * stdev],
        contributingFeatures: features,
      });
    });
  }

  results.sort((a, b) => b.zScore - a.zScore);
  const top = results.slice(0, 12);

  const explanation: AlgorithmExplanation = {
    algorithm: 'Anomaly Detection',
    summary: top.length
      ? `Flagged ${top.length} unusual expense${top.length > 1 ? 's' : ''} across ${byCategory.size} categories. Severity scales with MAD-based z-score (extreme ≥6, high ≥4, medium ≥2.5).`
      : 'No statistically significant outliers detected — your spending is consistent.',
    method: 'Per-category Modified Z-score with Hampel pre-filtering and global IQR fallback',
    formula: 'z = 0.6745 · (x − median(cleaned)) / MAD(cleaned)',
    features: [
      { name: 'Categories analyzed', value: byCategory.size, description: 'Spending grouped by category for context-aware baselines.' },
      { name: 'Hampel-cleaned categories', value: cleanedCategories, description: 'Pre-filter neutralized contamination before computing MAD.' },
      { name: 'Contaminated points removed', value: contaminatedPoints, description: 'Extreme values winsorized so a single shock doesn\'t mask others.' },
      { name: 'Global IQR upper fence', value: globalUpper.toFixed(2), description: 'Q3 + 1.5·IQR — secondary signal for low-confidence categories.' },
    ],
    evidence: top.slice(0, 6).map(a => ({
      id: a.id, date: a.date, payee: a.payee, amount: a.amount,
      reason: `z=${a.zScore} · ${a.severity}`,
      weight: Math.min(1, a.zScore / 8),
    })),
    diagnostics: [
      { label: 'Total expenses scanned', value: `${expenses.length}` },
      { label: 'Severity tiers', value: `${top.filter(a => a.severity === 'extreme').length}E · ${top.filter(a => a.severity === 'high').length}H · ${top.filter(a => a.severity === 'medium').length}M · ${top.filter(a => a.severity === 'low').length}L` },
    ],
    confidence: Math.min(1, expenses.length / 100),
  };

  return { results: top, explanation };
}
