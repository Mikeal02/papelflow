/**
 * Elite Anomaly Intelligence — multi-detector ensemble.
 *
 * Detectors:
 *   1. Robust Univariate (Modified Z via MAD with Hampel-cleaned baseline)
 *   2. Multivariate Mahalanobis (amount × hour × day-of-week × log-payee-novelty)
 *   3. Isolation-style Random Depth (random split path length → anomaly score)
 *   4. Temporal Drift (residual vs Holt-Winters expected daily total)
 *   5. Velocity Burst (rolling 3-day vs 30-day baseline ratio)
 *
 * Final score = soft-voted ensemble with confidence-weighted severity tier.
 */

import {
  mad,
  modifiedZScore,
  hampelFilter,
  welford,
  percentile,
  ema,
  holtLinear,
} from './statistics';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type DetectorKey = 'robust' | 'mahalanobis' | 'isolation' | 'temporal' | 'velocity';

export interface DetectorVote {
  key: DetectorKey;
  label: string;
  score: number;      // 0..1 normalized anomaly score
  fired: boolean;     // exceeds detector threshold
  detail: string;
}

export interface EliteAnomaly {
  id: string;
  txId: string;
  date: string;
  payee: string;
  category?: string;
  amount: number;
  ensembleScore: number;     // 0..1
  severity: Severity;
  confidence: number;        // 0..1
  votes: DetectorVote[];
  baseline: { median: number; expected: number; spread: number };
  drivers: { label: string; value: string; weight: number }[];
  riskGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface DetectorStats {
  key: DetectorKey;
  label: string;
  fires: number;
  meanScore: number;
}

export interface EliteAnomalyReport {
  anomalies: EliteAnomaly[];
  detectorStats: DetectorStats[];
  timeline: { date: string; expected: number; actual: number; residual: number; anomalyCount: number }[];
  globals: {
    scanned: number;
    flagged: number;
    falsePositiveBudget: number; // expected FP under H0
    coverage: number;            // fraction of categories with stable baseline
    health: number;              // 0..100, inverse of weighted severity load
  };
}

interface Tx {
  id: string;
  amount: number | string;
  date: string;
  type: string;
  payee?: string | null;
  category_id?: string | null;
  category?: { id?: string; name?: string; color?: string } | null;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/* ---------- Detector 1: Robust univariate ---------- */
function robustDetector(group: Tx[]) {
  const amts = group.map(t => Number(t.amount));
  const { cleaned } = hampelFilter(amts, Math.min(7, Math.max(2, Math.floor(amts.length / 2))), 3);
  const { median: med, mad: m } = mad(cleaned);
  const denom = m === 0 ? 1e-9 : 1.4826 * m;
  return group.map((t, i) => {
    const z = Math.abs((amts[i] - med) / denom);
    return {
      score: clamp01((z - 2) / 6),
      fired: z >= 2.5,
      z,
      median: med,
      spread: 1.4826 * m,
    };
  });
}

/* ---------- Detector 2: Mahalanobis (2D: log-amount, hour-proxy) ---------- */
function mahalanobisDetector(group: Tx[], payeeFreq: Map<string, number>) {
  const feats = group.map(t => {
    const logA = Math.log(Math.max(1, Number(t.amount)));
    const d = new Date(t.date);
    const novelty = 1 / Math.max(1, payeeFreq.get((t.payee || '').toLowerCase().trim()) || 1);
    return [logA, d.getDay() + d.getHours() / 24, novelty] as [number, number, number];
  });
  const cols = [0, 1, 2].map(j => feats.map(f => f[j]));
  const stats = cols.map(c => welford(c));
  return feats.map(f => {
    let d2 = 0;
    for (let j = 0; j < 3; j++) {
      const s = stats[j].variance || 1e-9;
      d2 += ((f[j] - stats[j].mean) ** 2) / s;
    }
    // chi-square df=3, 99% ≈ 11.34
    const score = clamp01((Math.sqrt(d2) - 1.7) / 3);
    return { score, fired: d2 >= 11.34, d2 };
  });
}

/* ---------- Detector 3: Random-projection Isolation depth ---------- */
function isolationDetector(group: Tx[], seed = 42) {
  const n = group.length;
  if (n < 4) return group.map(() => ({ score: 0, fired: false, depth: 0 }));
  const amts = group.map(t => Number(t.amount));
  const min = Math.min(...amts), max = Math.max(...amts);
  if (max === min) return group.map(() => ({ score: 0, fired: false, depth: 0 }));

  // Pseudo-random LCG for determinism
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };

  const trees = 24;
  const cap = Math.ceil(Math.log2(n));
  const depths = new Array(n).fill(0);

  for (let t = 0; t < trees; t++) {
    // Partition each point: count splits until isolated within random thresholds
    for (let i = 0; i < n; i++) {
      let lo = min, hi = max, depth = 0;
      const v = amts[i];
      while (depth < cap && hi - lo > 1e-6) {
        const split = lo + rand() * (hi - lo);
        if (v < split) hi = split; else lo = split;
        depth++;
        // simulate isolation when neighborhood shrinks below MAD/4
        if ((hi - lo) < (max - min) / (n * 2)) break;
      }
      depths[i] += depth;
    }
  }

  const avgDepth = depths.map(d => d / trees);
  const cAvg = 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n; // BST avg path
  const scores = avgDepth.map(d => Math.pow(2, -d / Math.max(cAvg, 1e-6))); // 0..1, higher = anomaly
  return scores.map(score => ({
    score: clamp01((score - 0.5) * 2),
    fired: score > 0.62,
    depth: score,
  }));
}

/* ---------- Detector 4: Temporal residual via Holt-Winters ---------- */
function temporalDetector(expenses: Tx[]) {
  const byDay = new Map<string, number>();
  for (const t of expenses) {
    const d = t.date.slice(0, 10);
    byDay.set(d, (byDay.get(d) || 0) + Number(t.amount));
  }
  const days = [...byDay.keys()].sort();
  const series = days.map(d => byDay.get(d) || 0);
  const { fitted } = holtLinear(series, 0.35, 0.15);
  const residuals = series.map((v, i) => v - (fitted[i] || v));
  const resStats = welford(residuals);
  const dayScore = new Map<string, { expected: number; actual: number; residual: number; score: number }>();
  days.forEach((d, i) => {
    const r = residuals[i];
    const sigma = Math.max(1, resStats.stdev);
    const z = r / sigma;
    dayScore.set(d, {
      expected: fitted[i] || 0,
      actual: series[i],
      residual: r,
      score: clamp01(sigmoid(z - 2)),
    });
  });
  return { dayScore, days, series, fitted };
}

/* ---------- Detector 5: Velocity burst ---------- */
function velocityDetector(expenses: Tx[]) {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const dayTotal = new Map<string, number>();
  for (const t of sorted) {
    const d = t.date.slice(0, 10);
    dayTotal.set(d, (dayTotal.get(d) || 0) + Number(t.amount));
  }
  const days = [...dayTotal.keys()].sort();
  const totals = days.map(d => dayTotal.get(d) || 0);
  const ema30 = ema(totals, 2 / 31);
  const ema3 = ema(totals, 2 / 4);
  const burst = new Map<string, number>();
  days.forEach((d, i) => {
    const base = Math.max(1, ema30[i] || 1);
    const ratio = (ema3[i] || 0) / base;
    burst.set(d, clamp01((ratio - 1.3) / 1.5));
  });
  return burst;
}

/* ---------- Ensemble + grading ---------- */
function gradeFromScore(s: number): EliteAnomaly['riskGrade'] {
  if (s >= 0.85) return 'F';
  if (s >= 0.7) return 'D';
  if (s >= 0.55) return 'C';
  if (s >= 0.35) return 'B';
  return 'A';
}
function severityFromScore(s: number): Severity {
  if (s >= 0.8) return 'critical';
  if (s >= 0.6) return 'high';
  if (s >= 0.4) return 'medium';
  return 'low';
}

const DETECTOR_LABELS: Record<DetectorKey, string> = {
  robust: 'Robust Z (MAD)',
  mahalanobis: 'Mahalanobis 3-D',
  isolation: 'Isolation Depth',
  temporal: 'Temporal Drift',
  velocity: 'Velocity Burst',
};

export function runEliteAnomalies(txs: Tx[]): EliteAnomalyReport {
  const expenses = txs.filter(t => t.type === 'expense' && t.date);
  if (expenses.length < 6) {
    return {
      anomalies: [],
      detectorStats: [],
      timeline: [],
      globals: { scanned: expenses.length, flagged: 0, falsePositiveBudget: 0, coverage: 0, health: 100 },
    };
  }

  // Payee frequencies
  const payeeFreq = new Map<string, number>();
  for (const t of expenses) {
    const p = (t.payee || '').toLowerCase().trim();
    payeeFreq.set(p, (payeeFreq.get(p) || 0) + 1);
  }

  // Per-category buckets for robust / mahalanobis / isolation
  const byCat = new Map<string, Tx[]>();
  for (const t of expenses) {
    const key = t.category_id || '__uncat__';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(t);
  }

  const robustMap = new Map<string, ReturnType<typeof robustDetector>[number]>();
  const mahaMap = new Map<string, ReturnType<typeof mahalanobisDetector>[number]>();
  const isoMap = new Map<string, ReturnType<typeof isolationDetector>[number]>();
  let stableCats = 0;
  for (const [, group] of byCat) {
    if (group.length >= 4) stableCats++;
    if (group.length < 3) continue;
    const r = robustDetector(group);
    const m = mahalanobisDetector(group, payeeFreq);
    const iso = isolationDetector(group, group.length * 7 + 17);
    group.forEach((t, i) => {
      robustMap.set(t.id, r[i]);
      mahaMap.set(t.id, m[i]);
      isoMap.set(t.id, iso[i]);
    });
  }

  const temporal = temporalDetector(expenses);
  const velocity = velocityDetector(expenses);

  // Build per-tx ensemble
  const detectorFires: Record<DetectorKey, number> = { robust: 0, mahalanobis: 0, isolation: 0, temporal: 0, velocity: 0 };
  const detectorSum: Record<DetectorKey, number> = { robust: 0, mahalanobis: 0, isolation: 0, temporal: 0, velocity: 0 };
  const detectorN: Record<DetectorKey, number> = { robust: 0, mahalanobis: 0, isolation: 0, temporal: 0, velocity: 0 };

  const weights: Record<DetectorKey, number> = {
    robust: 0.28, mahalanobis: 0.22, isolation: 0.2, temporal: 0.18, velocity: 0.12,
  };

  const anomalies: EliteAnomaly[] = [];

  for (const t of expenses) {
    const r = robustMap.get(t.id);
    const m = mahaMap.get(t.id);
    const iso = isoMap.get(t.id);
    const tDay = temporal.dayScore.get(t.date.slice(0, 10));
    const vDay = velocity.get(t.date.slice(0, 10)) ?? 0;

    const votes: DetectorVote[] = [
      {
        key: 'robust', label: DETECTOR_LABELS.robust,
        score: r?.score ?? 0, fired: !!r?.fired,
        detail: r ? `z=${r.z.toFixed(2)}` : 'insufficient sample',
      },
      {
        key: 'mahalanobis', label: DETECTOR_LABELS.mahalanobis,
        score: m?.score ?? 0, fired: !!m?.fired,
        detail: m ? `d²=${m.d2.toFixed(2)}` : 'insufficient sample',
      },
      {
        key: 'isolation', label: DETECTOR_LABELS.isolation,
        score: iso?.score ?? 0, fired: !!iso?.fired,
        detail: iso ? `path=${iso.depth.toFixed(2)}` : 'small bucket',
      },
      {
        key: 'temporal', label: DETECTOR_LABELS.temporal,
        score: tDay?.score ?? 0, fired: (tDay?.score ?? 0) > 0.55,
        detail: tDay ? `residual ${tDay.residual >= 0 ? '+' : ''}${tDay.residual.toFixed(0)}` : 'n/a',
      },
      {
        key: 'velocity', label: DETECTOR_LABELS.velocity,
        score: vDay, fired: vDay > 0.55,
        detail: vDay > 0 ? `burst ${(vDay * 100).toFixed(0)}%` : 'calm',
      },
    ];

    for (const v of votes) {
      detectorSum[v.key] += v.score;
      detectorN[v.key] += 1;
      if (v.fired) detectorFires[v.key] += 1;
    }

    // Weighted ensemble
    let score = 0, wsum = 0;
    for (const v of votes) {
      score += weights[v.key] * v.score;
      wsum += weights[v.key];
    }
    score = score / Math.max(wsum, 1e-9);

    // Vote agreement boost (≥2 detectors fired → +confidence and slight score lift)
    const fires = votes.filter(v => v.fired).length;
    if (fires >= 2) score = clamp01(score + 0.08 * (fires - 1));

    if (score < 0.32) continue;

    const median = r?.median ?? Number(t.amount);
    const spread = r?.spread ?? 0;
    const expected = tDay?.expected ?? median;

    const drivers = votes
      .filter(v => v.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(v => ({ label: v.label, value: v.detail, weight: v.score }));

    const confidence = clamp01(0.4 + 0.15 * fires + Math.min(0.3, expenses.length / 500));

    anomalies.push({
      id: `elite-${t.id}`,
      txId: t.id,
      date: t.date,
      payee: t.payee || 'Unknown',
      category: t.category?.name,
      amount: Number(t.amount),
      ensembleScore: Number(score.toFixed(3)),
      severity: severityFromScore(score),
      confidence,
      votes,
      baseline: { median, expected, spread },
      drivers,
      riskGrade: gradeFromScore(score),
    });
  }

  anomalies.sort((a, b) => b.ensembleScore - a.ensembleScore);

  const detectorStats: DetectorStats[] = (Object.keys(DETECTOR_LABELS) as DetectorKey[]).map(k => ({
    key: k,
    label: DETECTOR_LABELS[k],
    fires: detectorFires[k],
    meanScore: detectorN[k] ? detectorSum[k] / detectorN[k] : 0,
  }));

  const timeline = temporal.days.slice(-30).map((d, i, arr) => {
    const idx = temporal.days.length - arr.length + i;
    return {
      date: d,
      expected: Math.max(0, temporal.fitted[idx] || 0),
      actual: temporal.series[idx],
      residual: temporal.series[idx] - (temporal.fitted[idx] || 0),
      anomalyCount: anomalies.filter(a => a.date.slice(0, 10) === d).length,
    };
  });

  // Inverse weighted load → health
  const load = anomalies.reduce((s, a) => {
    const w = a.severity === 'critical' ? 4 : a.severity === 'high' ? 2 : a.severity === 'medium' ? 1 : 0.4;
    return s + w * a.ensembleScore;
  }, 0);
  const health = Math.max(0, Math.min(100, 100 - load * 6));

  return {
    anomalies: anomalies.slice(0, 20),
    detectorStats,
    timeline,
    globals: {
      scanned: expenses.length,
      flagged: anomalies.length,
      falsePositiveBudget: Math.max(1, Math.round(expenses.length * 0.005)),
      coverage: byCat.size ? stableCats / byCat.size : 0,
      health,
    },
  };
}
