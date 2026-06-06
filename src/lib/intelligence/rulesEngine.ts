/**
 * Rules Engine — converts elite intelligence outputs into actionable alerts.
 *
 * Capabilities:
 *  - Stable dedup keys (kind:subject) so repeated firings update the same row.
 *  - Scheduling windows (quiet hours, future ETA scheduling).
 *  - Severity escalation (low → critical) based on cumulative firings.
 *  - Snooze/acknowledgement aware (suppresses already-handled alerts).
 *  - Rule catalog: 6 rules across anomaly, merchant churn, retention, CLV,
 *    wallet concentration, and next-visit nudges.
 */

import type { EliteAnomalyReport, EliteAnomaly } from './anomalyElite';
import type { MerchantReport, EliteMerchant } from './merchantElite';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertKind =
  | 'anomaly'
  | 'merchant_churn'
  | 'merchant_revival'
  | 'wallet_concentration'
  | 'next_visit'
  | 'high_clv_at_risk';

export interface DraftAlert {
  dedupKey: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  body: string;
  scheduledFor: string; // ISO
  payload: Record<string, any>;
}

export interface ExistingAlert {
  dedup_key: string;
  acknowledged_at: string | null;
  dismissed_at: string | null;
  snooze_until: string | null;
  fired_count: number;
  severity: string;
}

export interface RuleContext {
  quietHourStart?: number; // 0..23
  quietHourEnd?: number;   // 0..23
  now?: Date;
  maxPerRun?: number;
}

const sevRank: Record<AlertSeverity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const escalate = (s: AlertSeverity): AlertSeverity =>
  (['low', 'medium', 'high', 'critical'] as AlertSeverity[])[
    Math.min(3, sevRank[s])
  ];

function nextAllowedTime(d: Date, ctx: RuleContext): Date {
  const qs = ctx.quietHourStart ?? 22;
  const qe = ctx.quietHourEnd ?? 7;
  const h = d.getHours();
  const inQuiet = qs > qe ? (h >= qs || h < qe) : (h >= qs && h < qe);
  if (!inQuiet) return d;
  const next = new Date(d);
  next.setHours(qe, 0, 0, 0);
  if (next <= d) next.setDate(next.getDate() + 1);
  return next;
}

function fromAnomaly(a: EliteAnomaly, ctx: RuleContext): DraftAlert {
  const sched = nextAllowedTime(ctx.now || new Date(), ctx);
  return {
    dedupKey: `anomaly:${a.txId}`,
    kind: 'anomaly',
    severity: a.severity,
    title: `Unusual ${a.category || 'transaction'}: ${a.payee}`,
    body: `${a.amount.toFixed(2)} flagged by ${a.votes.filter(v => v.fired).length} detectors. Confidence ${(a.confidence * 100).toFixed(0)}%.`,
    scheduledFor: sched.toISOString(),
    payload: {
      txId: a.txId,
      ensembleScore: a.ensembleScore,
      drivers: a.drivers,
      riskGrade: a.riskGrade,
    },
  };
}

function fromMerchantChurn(m: EliteMerchant, ctx: RuleContext): DraftAlert | null {
  if (m.churnRisk < 0.65 || m.visits < 4) return null;
  const sev: AlertSeverity = m.churnRisk > 0.85 ? 'high' : 'medium';
  const sched = nextAllowedTime(ctx.now || new Date(), ctx);
  return {
    dedupKey: `churn:${m.key}`,
    kind: 'merchant_churn',
    severity: sev,
    title: `${m.name} — churn risk ${Math.round(m.churnRisk * 100)}%`,
    body: `Last visit ${Math.round(m.daysSinceLast)}d ago vs. usual cadence of ${Math.round(m.meanInterval)}d. Segment: ${m.segment}.`,
    scheduledFor: sched.toISOString(),
    payload: { merchant: m.name, segment: m.segment, churnRisk: m.churnRisk, clv12m: m.clv12m },
  };
}

function fromHighClvAtRisk(m: EliteMerchant, ctx: RuleContext): DraftAlert | null {
  if (m.churnRisk < 0.5) return null;
  if (m.clv12m < 500) return null;
  if (m.segment !== 'AtRisk' && m.segment !== 'Hibernating') return null;
  const sched = nextAllowedTime(ctx.now || new Date(), ctx);
  return {
    dedupKey: `clv_risk:${m.key}`,
    kind: 'high_clv_at_risk',
    severity: 'high',
    title: `High-value relationship slipping: ${m.name}`,
    body: `Projected 12-month value $${m.clv12m.toFixed(0)} with ${Math.round(m.churnRisk * 100)}% churn risk.`,
    scheduledFor: sched.toISOString(),
    payload: { merchant: m.name, clv12m: m.clv12m, churnRisk: m.churnRisk },
  };
}

function fromMerchantRevival(m: EliteMerchant, ctx: RuleContext): DraftAlert | null {
  if (m.trend !== 'accelerating' || m.visits < 4) return null;
  if (m.share < 0.04) return null;
  const sched = nextAllowedTime(ctx.now || new Date(), ctx);
  return {
    dedupKey: `revival:${m.key}`,
    kind: 'merchant_revival',
    severity: 'low',
    title: `${m.name} spending accelerating`,
    body: `Recent ticket average is climbing. Share of wallet ${(m.share * 100).toFixed(1)}%.`,
    scheduledFor: sched.toISOString(),
    payload: { merchant: m.name, share: m.share, trend: m.trend },
  };
}

function fromWalletConcentration(r: MerchantReport, ctx: RuleContext): DraftAlert | null {
  if (r.loyaltyHHI < 0.18) return null;
  const sev: AlertSeverity = r.loyaltyHHI > 0.32 ? 'high' : 'medium';
  const top = r.merchants[0];
  const sched = nextAllowedTime(ctx.now || new Date(), ctx);
  return {
    dedupKey: `wallet_concentration:hhi`,
    kind: 'wallet_concentration',
    severity: sev,
    title: `Spending concentrated (HHI ${(r.loyaltyHHI * 100).toFixed(0)})`,
    body: top
      ? `${top.name} alone is ${(top.share * 100).toFixed(0)}% of expenses. Diversify to reduce vendor risk.`
      : `Wallet concentration is elevated.`,
    scheduledFor: sched.toISOString(),
    payload: { hhi: r.loyaltyHHI, top: top?.name, share: top?.share },
  };
}

function fromNextVisit(m: EliteMerchant, ctx: RuleContext): DraftAlert | null {
  if (!m.nextVisitEtaDays || m.nextVisitEtaDays > 14 || m.visits < 5) return null;
  if (m.churnRisk > 0.6) return null; // separate alert handles risk
  const now = ctx.now || new Date();
  const sched = new Date(now.getTime() + Math.max(0, (m.nextVisitEtaDays - 1)) * 86400000);
  return {
    dedupKey: `next_visit:${m.key}`,
    kind: 'next_visit',
    severity: 'low',
    title: `${m.name} likely in ~${Math.round(m.nextVisitEtaDays)}d`,
    body: `Avg ticket $${m.avgTicket.toFixed(0)}, 80% window ${m.nextVisitWindow?.map(n => Math.round(n)).join('–')}d.`,
    scheduledFor: nextAllowedTime(sched, ctx).toISOString(),
    payload: {
      merchant: m.name, eta: m.nextVisitEtaDays,
      window: m.nextVisitWindow, avgTicket: m.avgTicket,
    },
  };
}

export interface EvaluationResult {
  drafts: DraftAlert[];
  upserts: DraftAlert[];   // new or changed (will be persisted)
  suppressed: number;      // existing acknowledged/dismissed/snoozed
  unchanged: number;
}

export function evaluateRules(
  anomalies: EliteAnomalyReport,
  merchants: MerchantReport,
  existing: ExistingAlert[] = [],
  ctx: RuleContext = {}
): EvaluationResult {
  const now = ctx.now || new Date();
  const max = ctx.maxPerRun ?? 30;
  const existingMap = new Map<string, ExistingAlert>();
  for (const e of existing) existingMap.set(e.dedup_key, e);

  const drafts: DraftAlert[] = [];

  // Anomalies: prioritize top 8 by ensembleScore, skip low severity unless very recent
  const anomCandidates = [...anomalies.anomalies]
    .sort((a, b) => b.ensembleScore - a.ensembleScore)
    .slice(0, 12);
  for (const a of anomCandidates) drafts.push(fromAnomaly(a, ctx));

  // Merchant churn
  for (const m of merchants.merchants.slice(0, 40)) {
    const c = fromMerchantChurn(m, ctx);
    if (c) drafts.push(c);
    const clv = fromHighClvAtRisk(m, ctx);
    if (clv) drafts.push(clv);
    const rev = fromMerchantRevival(m, ctx);
    if (rev) drafts.push(rev);
    const nv = fromNextVisit(m, ctx);
    if (nv) drafts.push(nv);
  }

  // Wallet concentration (singleton)
  const wc = fromWalletConcentration(merchants, ctx);
  if (wc) drafts.push(wc);

  // Dedup + suppress
  const upserts: DraftAlert[] = [];
  let suppressed = 0;
  let unchanged = 0;
  const seen = new Set<string>();

  for (const d of drafts) {
    if (seen.has(d.dedupKey)) continue;
    seen.add(d.dedupKey);

    const ex = existingMap.get(d.dedupKey);
    if (ex) {
      if (ex.dismissed_at) { suppressed++; continue; }
      if (ex.snooze_until && new Date(ex.snooze_until) > now) { suppressed++; continue; }
      if (ex.acknowledged_at && ex.severity === d.severity) { suppressed++; continue; }
      // Escalate after 3 firings without ack
      const finalSev: AlertSeverity =
        ex.fired_count >= 3 && !ex.acknowledged_at && sevRank[d.severity] < 4
          ? escalate(d.severity)
          : d.severity;
      if (finalSev !== d.severity) d.severity = finalSev;
      unchanged += 0;
      upserts.push(d);
    } else {
      upserts.push(d);
    }
    if (upserts.length >= max) break;
  }

  return { drafts, upserts, suppressed, unchanged };
}
