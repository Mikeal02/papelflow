/**
 * Spending DNA — multi-dimensional behavioral fingerprint.
 *
 * Composes seven orthogonal signals into a normalized "genome" vector:
 *  - Circadian (entropy of hour-of-day spend distribution)
 *  - Weekday vs Weekend bias
 *  - Impulse Index (variance of daily spend / mean)
 *  - Discretionary Ratio (non-essential spend share)
 *  - Merchant Loyalty (HHI of merchant concentration)
 *  - Velocity (rolling 7d acceleration)
 *  - Emotional Volatility (kurtosis-like fat-tail measure)
 *
 * Produces:
 *  - genome vector (7D, 0..100 per axis)
 *  - top behavioral triggers (peak hour, peak weekday, biggest merchant)
 *  - predicted "next likely spend" with merchant + amount window + confidence
 *  - peer benchmarks (synthetic cohort baseline)
 *  - actionable behavioral nudges
 */

import { parseISO, getHours, getDay, format, differenceInDays } from 'date-fns';
import { entropy, welford, percentile, mean } from './statistics';

interface Tx {
  amount: number | string;
  date: string;
  type: string;
  payee?: string | null;
  description?: string | null;
  category?: { name?: string; category_group?: string | null } | null;
}

export interface DnaAxis {
  key: 'circadian' | 'weekendBias' | 'impulse' | 'discretionary' | 'loyalty' | 'velocity' | 'emotional';
  label: string;
  value: number;      // 0..100
  benchmark: number;  // peer median 0..100
  description: string;
}

export interface NextLikelyEvent {
  merchant: string;
  category: string;
  expectedAmountLow: number;
  expectedAmountHigh: number;
  expectedWindow: string;     // human readable
  probability: number;        // 0..1
  reasoning: string;
}

export interface BehavioralTrigger {
  name: string;
  detail: string;
  strength: number;    // 0..1
  category: 'time' | 'place' | 'mood' | 'frequency';
}

export interface SpendingDnaReport {
  genome: DnaAxis[];
  overallScore: number;        // weighted health 0..100
  archetypeBlend: { name: string; weight: number }[];   // soft membership
  triggers: BehavioralTrigger[];
  nextLikely: NextLikelyEvent[];
  hourHeatmap: number[];       // 24 entries, normalized 0..1
  dayHeatmap: number[];        // 7 entries, normalized 0..1
  fingerprint: string;         // hex-like deterministic signature
  recommendations: { title: string; detail: string; impactUSD: number }[];
  diagnostics: { label: string; value: string | number }[];
}

const ESSENTIAL_KEYS = ['rent', 'mortgage', 'utility', 'utilities', 'grocer', 'insurance', 'health', 'medical', 'transport', 'fuel', 'gas'];
const DISCRETIONARY_KEYS = ['restaurant', 'dining', 'coffee', 'entertainment', 'streaming', 'travel', 'shopping', 'clothing', 'bar', 'alcohol'];

function isEssential(name: string): boolean {
  const l = name.toLowerCase();
  return ESSENTIAL_KEYS.some(k => l.includes(k));
}
function isDiscretionary(name: string): boolean {
  const l = name.toLowerCase();
  return DISCRETIONARY_KEYS.some(k => l.includes(k));
}

function normalizeMerchant(name: string | null | undefined): string {
  if (!name) return 'Unknown';
  return name
    .replace(/\s+#?\d+.*$/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .slice(0, 3)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Unknown';
}

function clamp(v: number, lo = 0, hi = 100): number { return Math.max(lo, Math.min(hi, v)); }

function deterministicHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8).toUpperCase();
}

export function analyzeSpendingDna(txs: Tx[]): SpendingDnaReport {
  const expenses = txs.filter(t => t.type === 'expense').map(t => ({
    amt: Number(t.amount),
    date: parseISO(t.date),
    merchant: normalizeMerchant(t.payee || t.description || t.category?.name || 'Unknown'),
    category: t.category?.name || 'Uncategorized',
  })).filter(t => t.amt > 0 && !isNaN(t.date.getTime()));

  if (!expenses.length) {
    return emptyReport();
  }

  // Hour distribution
  const hourCounts = new Array(24).fill(0);
  const hourAmounts = new Array(24).fill(0);
  for (const e of expenses) {
    const h = getHours(e.date);
    hourCounts[h]++;
    hourAmounts[h] += e.amt;
  }
  const hourEntropy = entropy(hourCounts);
  const maxEntropy = Math.log2(24);
  const circadianScore = clamp(100 - (hourEntropy / maxEntropy) * 100);
  // low entropy -> very habitual; high entropy -> chaotic timing
  const peakHour = hourAmounts.indexOf(Math.max(...hourAmounts));

  // Weekday vs weekend
  let weekendAmt = 0, weekdayAmt = 0;
  const dayAmounts = new Array(7).fill(0);
  for (const e of expenses) {
    const d = getDay(e.date);
    dayAmounts[d] += e.amt;
    if (d === 0 || d === 6) weekendAmt += e.amt; else weekdayAmt += e.amt;
  }
  const total = weekendAmt + weekdayAmt;
  const weekendShare = total ? weekendAmt / total : 0;
  // Expected weekend share = 2/7 ≈ 0.286
  const weekendBias = clamp(50 + (weekendShare - 0.286) * 200);
  const peakDay = dayAmounts.indexOf(Math.max(...dayAmounts));

  // Daily aggregation for impulse
  const dailyMap = new Map<string, number>();
  for (const e of expenses) {
    const k = format(e.date, 'yyyy-MM-dd');
    dailyMap.set(k, (dailyMap.get(k) || 0) + e.amt);
  }
  const dailyArr = [...dailyMap.values()];
  const { mean: dMean, stdev: dStd } = welford(dailyArr);
  const cv = dMean > 0 ? dStd / dMean : 0;       // coefficient of variation
  const impulseScore = clamp(cv * 50);           // bounded

  // Discretionary ratio
  let discAmt = 0, essAmt = 0;
  for (const e of expenses) {
    if (isEssential(e.category)) essAmt += e.amt;
    else if (isDiscretionary(e.category)) discAmt += e.amt;
  }
  const discTotal = discAmt + essAmt;
  const discRatio = discTotal > 0 ? discAmt / discTotal : 0;
  const discretionaryScore = clamp(discRatio * 100);

  // Merchant loyalty (HHI)
  const merchantAmt = new Map<string, number>();
  for (const e of expenses) merchantAmt.set(e.merchant, (merchantAmt.get(e.merchant) || 0) + e.amt);
  const totalSpend = expenses.reduce((a, b) => a + b.amt, 0);
  let hhi = 0;
  merchantAmt.forEach(v => { const s = v / totalSpend; hhi += s * s; });
  const loyaltyScore = clamp(hhi * 200);  // HHI in [0,1]; 0.5 -> 100

  // Velocity — slope of 7d rolling sum
  const sortedDays = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const rolling: number[] = [];
  for (let i = 0; i < sortedDays.length; i++) {
    const lo = Math.max(0, i - 6);
    let s = 0;
    for (let j = lo; j <= i; j++) s += sortedDays[j][1];
    rolling.push(s);
  }
  const recent = rolling.slice(-14);
  const older = rolling.slice(-28, -14);
  const velocityDelta = mean(recent) - mean(older);
  const velocityScore = clamp(50 + (velocityDelta / Math.max(1, mean(rolling))) * 100);

  // Emotional volatility — share of days >2σ above mean
  const fatTailCount = dailyArr.filter(v => v > dMean + 2 * dStd).length;
  const emotionalScore = clamp((fatTailCount / Math.max(1, dailyArr.length)) * 500);

  const genome: DnaAxis[] = [
    { key: 'circadian',     label: 'Circadian Pattern',  value: circadianScore,    benchmark: 55, description: 'How habitual your spending times are. Higher = more predictable hours.' },
    { key: 'weekendBias',   label: 'Weekend Bias',       value: weekendBias,       benchmark: 55, description: 'Tilt of spending toward weekends.' },
    { key: 'impulse',       label: 'Impulse Index',      value: impulseScore,      benchmark: 45, description: 'Daily-spend variability vs mean (CV).' },
    { key: 'discretionary', label: 'Discretionary Share', value: discretionaryScore, benchmark: 35, description: 'Share of non-essential spend.' },
    { key: 'loyalty',       label: 'Merchant Loyalty',   value: loyaltyScore,      benchmark: 30, description: 'Concentration across merchants (HHI).' },
    { key: 'velocity',      label: 'Spending Velocity',  value: velocityScore,     benchmark: 50, description: 'Recent 14d vs prior 14d trajectory.' },
    { key: 'emotional',     label: 'Emotional Volatility', value: emotionalScore, benchmark: 25, description: 'Frequency of >2σ spend spikes (fat-tail days).' },
  ];

  // Health composite (lower impulse/disc/emotional, higher loyalty, neutral circadian)
  const overallScore = clamp(
    100 - 0.25 * impulseScore - 0.25 * discretionaryScore - 0.2 * emotionalScore
        + 0.15 * loyaltyScore + 0.1 * (100 - Math.abs(velocityScore - 50) * 2) + 0.05 * circadianScore
  );

  // Soft archetype blend
  const archetypeBlend = blendArchetypes(genome);

  // Triggers
  const triggers: BehavioralTrigger[] = [
    { name: `Peak hour ${peakHour}:00`, detail: `Most $ spent around ${peakHour}:00.`, strength: clamp(hourAmounts[peakHour] / totalSpend) / 100 + 0.1, category: 'time' },
    { name: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][peakDay], detail: `Heaviest day: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][peakDay]}.`, strength: dayAmounts[peakDay] / total, category: 'time' },
  ];
  const topMerchants = [...merchantAmt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  topMerchants.forEach(([m, v]) => triggers.push({
    name: m, detail: `${((v / totalSpend) * 100).toFixed(1)}% of total spend.`,
    strength: v / totalSpend, category: 'place'
  }));
  if (impulseScore > 60) triggers.push({ name: 'Impulse-prone', detail: 'Daily spend volatility is well above peer median.', strength: impulseScore / 100, category: 'mood' });

  // Next-likely events — based on recurring merchant cadence
  const nextLikely = predictNextEvents(expenses);

  // Heatmaps
  const maxHour = Math.max(...hourAmounts, 1);
  const hourHeatmap = hourAmounts.map(v => v / maxHour);
  const maxDay = Math.max(...dayAmounts, 1);
  const dayHeatmap = dayAmounts.map(v => v / maxDay);

  // Fingerprint
  const fpInput = genome.map(g => g.key + ':' + Math.round(g.value)).join('|');
  const fingerprint = deterministicHash(fpInput);

  // Recommendations
  const recommendations: SpendingDnaReport['recommendations'] = [];
  if (discretionaryScore > 50) {
    const monthlyDisc = discAmt / Math.max(1, dailyArr.length) * 30;
    recommendations.push({
      title: 'Cap discretionary at 35%',
      detail: 'Shift the marginal 15% of discretionary spend into automated savings.',
      impactUSD: monthlyDisc * 0.15,
    });
  }
  if (loyaltyScore > 60) {
    const concentrated = topMerchants[0];
    recommendations.push({
      title: `Negotiate with ${concentrated[0]}`,
      detail: `Heavy concentration unlocks loyalty pricing — request a 10% account adjustment.`,
      impactUSD: concentrated[1] * 0.1,
    });
  }
  if (emotionalScore > 40) {
    recommendations.push({
      title: 'Add a 24h cooldown',
      detail: 'Auto-flag any single charge >2σ above your daily mean for review.',
      impactUSD: dStd * 4,
    });
  }
  if (velocityScore > 65) {
    recommendations.push({
      title: 'Pump the brakes',
      detail: 'Recent 14d spend is materially faster than prior 14d. Re-check budgets.',
      impactUSD: velocityDelta * 14,
    });
  }

  return {
    genome,
    overallScore,
    archetypeBlend,
    triggers: triggers.sort((a, b) => b.strength - a.strength).slice(0, 6),
    nextLikely,
    hourHeatmap,
    dayHeatmap,
    fingerprint,
    recommendations,
    diagnostics: [
      { label: 'Expenses analyzed', value: expenses.length },
      { label: 'Unique merchants', value: merchantAmt.size },
      { label: 'Active days', value: dailyArr.length },
      { label: 'Daily mean', value: `$${dMean.toFixed(2)}` },
      { label: 'Daily σ', value: `$${dStd.toFixed(2)}` },
      { label: 'HHI', value: hhi.toFixed(3) },
      { label: 'Hour entropy', value: hourEntropy.toFixed(2) },
    ],
  };
}

function blendArchetypes(genome: DnaAxis[]): { name: string; weight: number }[] {
  const m = Object.fromEntries(genome.map(g => [g.key, g.value]));
  const raw = {
    'Disciplined Saver': (100 - m.discretionary) * 0.5 + (100 - m.impulse) * 0.5,
    'Experience Seeker': m.discretionary * 0.5 + m.weekendBias * 0.3 + m.emotional * 0.2,
    'Habitual Routine':  m.circadian * 0.5 + m.loyalty * 0.5,
    'Impulse Driver':    m.impulse * 0.6 + m.emotional * 0.4,
    'Accelerator':       m.velocity * 0.6 + m.discretionary * 0.4,
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(raw)
    .map(([name, v]) => ({ name, weight: v / total }))
    .sort((a, b) => b.weight - a.weight);
}

function predictNextEvents(
  expenses: { amt: number; date: Date; merchant: string; category: string }[]
): NextLikelyEvent[] {
  // Group by merchant, compute mean interval and amount stats.
  const byMerchant = new Map<string, { dates: Date[]; amts: number[]; category: string }>();
  for (const e of expenses) {
    if (!byMerchant.has(e.merchant)) byMerchant.set(e.merchant, { dates: [], amts: [], category: e.category });
    const b = byMerchant.get(e.merchant)!;
    b.dates.push(e.date);
    b.amts.push(e.amt);
  }

  const today = new Date();
  const candidates: NextLikelyEvent[] = [];
  byMerchant.forEach((b, merchant) => {
    if (b.dates.length < 3) return;
    const sorted = [...b.dates].sort((a, c) => a.getTime() - c.getTime());
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(differenceInDays(sorted[i], sorted[i - 1]));
    const meanInt = mean(intervals);
    const { stdev } = welford(intervals);
    if (meanInt < 1 || meanInt > 120) return;
    const last = sorted[sorted.length - 1];
    const daysSince = differenceInDays(today, last);
    const expectedIn = Math.max(0, meanInt - daysSince);
    const cv = stdev / Math.max(1, meanInt);
    // Stronger cadence regularity → higher probability
    const probability = Math.max(0.1, Math.min(0.95, 0.9 - cv));
    const amtMean = mean(b.amts);
    const { stdev: amtSd } = welford(b.amts);
    candidates.push({
      merchant,
      category: b.category,
      expectedAmountLow: Math.max(0, amtMean - amtSd),
      expectedAmountHigh: amtMean + amtSd,
      expectedWindow: expectedIn <= 1 ? 'within 24h' : expectedIn <= 7 ? `~${Math.round(expectedIn)} days` : `~${Math.round(expectedIn / 7)} weeks`,
      probability,
      reasoning: `${b.dates.length} prior charges · cadence ${meanInt.toFixed(1)}d (σ=${stdev.toFixed(1)})`,
    });
  });

  return candidates
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 6);
}

function emptyReport(): SpendingDnaReport {
  return {
    genome: [],
    overallScore: 0,
    archetypeBlend: [],
    triggers: [],
    nextLikely: [],
    hourHeatmap: new Array(24).fill(0),
    dayHeatmap: new Array(7).fill(0),
    fingerprint: '00000000',
    recommendations: [],
    diagnostics: [],
  };
}
