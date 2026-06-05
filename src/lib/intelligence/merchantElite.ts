/**
 * Elite Merchant Intelligence Engine.
 *
 * Capabilities:
 *  - RFM segmentation (Recency, Frequency, Monetary) with quintile binning
 *  - Customer Lifetime Value (CLV) projection (BG/NBD-inspired heuristic)
 *  - Churn risk via survival-style hazard from inter-purchase intervals
 *  - Next-visit prediction (Poisson interval estimator with 80% CI)
 *  - Price elasticity per merchant (linear regression of ticket vs time)
 *  - Co-visit graph (week-level co-occurrence → Jaccard edges)
 *  - Loyalty concentration via Herfindahl-Hirschman Index across merchants
 */

import { mean, welford, percentile, linearRegression, similarity } from './statistics';

interface Tx {
  id: string;
  amount: number | string;
  date: string;
  type: string;
  payee?: string | null;
  category_id?: string | null;
  category?: { name?: string; color?: string } | null;
}

export type MerchantSegment =
  | 'Champion' | 'Loyal' | 'Potential' | 'New' | 'AtRisk' | 'Hibernating' | 'Lost';

export interface EliteMerchant {
  key: string;             // canonical (lowercase trimmed)
  name: string;            // display
  category?: string;
  visits: number;
  totalSpent: number;
  avgTicket: number;
  medianTicket: number;
  stdevTicket: number;
  firstVisit: string;
  lastVisit: string;
  daysSinceLast: number;
  meanInterval: number;       // days between visits
  intervalStdev: number;
  share: number;              // share of total spend
  rfm: { r: number; f: number; m: number; score: number };
  segment: MerchantSegment;
  churnRisk: number;          // 0..1
  retention90d: number;       // P(visit in next 90d), 0..1
  nextVisitEtaDays: number | null;
  nextVisitWindow: [number, number] | null; // 80% CI in days from today
  clv12m: number;             // projected 12-month value
  priceElasticity: number;    // slope of ticket vs time
  trend: 'accelerating' | 'stable' | 'decelerating';
  visitTimeline: { date: string; amount: number }[];
  monthlySparkline: number[];
}

export interface MerchantGraphEdge {
  a: string;
  b: string;
  weight: number; // Jaccard 0..1
  coWeeks: number;
}

export interface MerchantReport {
  merchants: EliteMerchant[];
  segments: Record<MerchantSegment, number>;
  graph: MerchantGraphEdge[];
  loyaltyHHI: number;     // 0..1 (concentration)
  diversityIndex: number; // 0..1 (1 - HHI normalized)
  totalLifetime: number;
  projectedAnnual: number;
  topRelationships: { merchant: string; partner: string; weight: number }[];
  dna: { recencyMedian: number; frequencyMedian: number; monetaryMedian: number };
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const titleCase = (s: string) =>
  s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function quintile(value: number, sortedAsc: number[]): number {
  if (!sortedAsc.length) return 3;
  for (let q = 1; q <= 5; q++) {
    const cut = percentile(sortedAsc, q / 5);
    if (value <= cut) return q;
  }
  return 5;
}

function segmentFromRFM(r: number, f: number, m: number): MerchantSegment {
  // r=5 means most recent (we invert below)
  if (r >= 4 && f >= 4 && m >= 4) return 'Champion';
  if (r >= 4 && f >= 3) return 'Loyal';
  if (r >= 4 && f <= 2) return 'New';
  if (r === 3 && f >= 3) return 'Potential';
  if (r === 2 && f >= 3) return 'AtRisk';
  if (r <= 2 && f <= 2 && m >= 3) return 'Hibernating';
  return 'Lost';
}

export function runMerchantElite(txs: Tx[]): MerchantReport {
  const expenses = txs.filter(t => t.type === 'expense' && t.payee && t.date);
  const now = Date.now();
  const dayMs = 86400000;

  // Cluster near-duplicate payee strings (similarity ≥ 0.86)
  const buckets: { canon: string; display: string; members: Set<string>; txs: Tx[] }[] = [];
  for (const t of expenses) {
    const raw = (t.payee || '').trim();
    const key = norm(raw);
    let placed = false;
    for (const b of buckets) {
      if (similarity(key, b.canon) >= 0.86) {
        b.members.add(key);
        b.txs.push(t);
        // keep shortest canonical
        if (key.length < b.canon.length) { b.canon = key; b.display = titleCase(key); }
        placed = true; break;
      }
    }
    if (!placed) buckets.push({ canon: key, display: titleCase(key), members: new Set([key]), txs: [t] });
  }

  const totalSpend = expenses.reduce((s, t) => s + Number(t.amount), 0) || 1;

  // Pre-compute weekly visit sets per merchant for co-visit graph
  const merchantWeeks = new Map<string, Set<string>>();
  const weekKey = (d: string) => {
    const dt = new Date(d);
    const yr = dt.getUTCFullYear();
    const start = new Date(Date.UTC(yr, 0, 1));
    const w = Math.floor((dt.getTime() - start.getTime()) / (7 * dayMs));
    return `${yr}-${w}`;
  };

  // Build merchant objects
  const recencyVals: number[] = [];
  const frequencyVals: number[] = [];
  const monetaryVals: number[] = [];

  const raw: EliteMerchant[] = buckets.map(b => {
    const ts = b.txs.slice().sort((x, y) => x.date.localeCompare(y.date));
    const amts = ts.map(t => Number(t.amount));
    const dates = ts.map(t => t.date);
    const wel = welford(amts);
    const sortedAmts = [...amts].sort((a, b) => a - b);
    const medianTicket = sortedAmts[Math.floor(sortedAmts.length / 2)];
    const total = amts.reduce((s, x) => s + x, 0);
    const last = dates[dates.length - 1];
    const first = dates[0];
    const daysSince = (now - new Date(last).getTime()) / dayMs;
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / dayMs);
    }
    const intStats = welford(intervals);
    const mIv = intStats.mean || ((now - new Date(first).getTime()) / dayMs / Math.max(1, dates.length));

    // Poisson estimator: λ = visits/total span
    const span = Math.max(1, (new Date(last).getTime() - new Date(first).getTime()) / dayMs + 1);
    const lambdaPerDay = ts.length / span;
    const retention90d = 1 - Math.exp(-lambdaPerDay * 90);
    // Hazard-style churn risk: how many expected intervals have elapsed since last
    const churnRisk = mIv > 0 ? Math.min(1, Math.max(0, (daysSince / (mIv * 2)) - 0.25)) : 0.5;

    const nextEta = mIv > 0 ? Math.max(0, mIv - daysSince) : null;
    const stdIv = intStats.stdev || mIv * 0.4;
    const nextWindow: [number, number] | null = nextEta == null
      ? null
      : [Math.max(0, nextEta - 1.28 * stdIv), nextEta + 1.28 * stdIv];

    // Elasticity: slope of ticket vs index
    const reg = linearRegression(amts);

    // Trend (recent half vs older half)
    const mid = Math.floor(amts.length / 2);
    const oldAvg = mid > 0 ? mean(amts.slice(0, mid)) : 0;
    const newAvg = amts.slice(mid).length ? mean(amts.slice(mid)) : oldAvg;
    let trend: EliteMerchant['trend'] = 'stable';
    if (newAvg > oldAvg * 1.15) trend = 'accelerating';
    else if (newAvg < oldAvg * 0.85) trend = 'decelerating';

    // CLV = (avgTicket × expected visits/year) × retention factor
    const visitsYr = lambdaPerDay * 365;
    const clv12m = wel.mean * visitsYr * (1 - churnRisk * 0.5);

    // Track weekly visits
    const weeks = new Set<string>(ts.map(t => weekKey(t.date)));
    merchantWeeks.set(b.canon, weeks);

    // Monthly sparkline (last 12 months count)
    const sparks = new Array(12).fill(0);
    const nowD = new Date();
    for (const t of ts) {
      const d = new Date(t.date);
      const mDiff = (nowD.getUTCFullYear() - d.getUTCFullYear()) * 12 + (nowD.getUTCMonth() - d.getUTCMonth());
      if (mDiff >= 0 && mDiff < 12) sparks[11 - mDiff] += 1;
    }

    recencyVals.push(daysSince);
    frequencyVals.push(ts.length);
    monetaryVals.push(total);

    return {
      key: b.canon,
      name: b.display,
      category: ts[0]?.category?.name,
      visits: ts.length,
      totalSpent: total,
      avgTicket: wel.mean,
      medianTicket,
      stdevTicket: wel.stdev,
      firstVisit: first,
      lastVisit: last,
      daysSinceLast: daysSince,
      meanInterval: mIv,
      intervalStdev: stdIv,
      share: total / totalSpend,
      rfm: { r: 0, f: 0, m: 0, score: 0 }, // filled below
      segment: 'Lost',
      churnRisk,
      retention90d,
      nextVisitEtaDays: nextEta,
      nextVisitWindow: nextWindow,
      clv12m,
      priceElasticity: reg.slope,
      trend,
      visitTimeline: ts.map(t => ({ date: t.date, amount: Number(t.amount) })),
      monthlySparkline: sparks,
    } as EliteMerchant;
  });

  // RFM quintiles
  const recSorted = [...recencyVals].sort((a, b) => a - b); // lower days = better → invert
  const freqSorted = [...frequencyVals].sort((a, b) => a - b);
  const monSorted = [...monetaryVals].sort((a, b) => a - b);
  for (const m of raw) {
    const rRaw = quintile(m.daysSinceLast, recSorted);
    const r = 6 - rRaw; // invert so 5 = most recent
    const f = quintile(m.visits, freqSorted);
    const mq = quintile(m.totalSpent, monSorted);
    m.rfm = { r, f, m: mq, score: r * 100 + f * 10 + mq };
    m.segment = segmentFromRFM(r, f, mq);
  }

  // Co-visit graph (Jaccard on weekly sets), only for merchants with ≥3 visits
  const eligible = raw.filter(m => m.visits >= 3).slice(0, 25);
  const edges: MerchantGraphEdge[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = merchantWeeks.get(eligible[i].key) || new Set();
      const b = merchantWeeks.get(eligible[j].key) || new Set();
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      const union = a.size + b.size - inter;
      if (union === 0 || inter === 0) continue;
      const jac = inter / union;
      if (jac >= 0.2) edges.push({ a: eligible[i].name, b: eligible[j].name, weight: jac, coWeeks: inter });
    }
  }
  edges.sort((x, y) => y.weight - x.weight);

  const topRelationships = edges.slice(0, 8).map(e => ({
    merchant: e.a, partner: e.b, weight: e.weight,
  }));

  // HHI loyalty concentration
  const hhi = raw.reduce((s, m) => s + m.share * m.share, 0);
  const diversity = 1 - Math.min(1, hhi);

  // Segments tally
  const segments: Record<MerchantSegment, number> = {
    Champion: 0, Loyal: 0, Potential: 0, New: 0, AtRisk: 0, Hibernating: 0, Lost: 0,
  };
  for (const m of raw) segments[m.segment]++;

  const projectedAnnual = raw.reduce((s, m) => s + m.clv12m, 0);

  raw.sort((a, b) => b.rfm.score - a.rfm.score);

  return {
    merchants: raw,
    segments,
    graph: edges,
    loyaltyHHI: hhi,
    diversityIndex: diversity,
    totalLifetime: totalSpend,
    projectedAnnual,
    topRelationships,
    dna: {
      recencyMedian: percentile(recencyVals, 0.5),
      frequencyMedian: percentile(frequencyVals, 0.5),
      monetaryMedian: percentile(monetaryVals, 0.5),
    },
  };
}
