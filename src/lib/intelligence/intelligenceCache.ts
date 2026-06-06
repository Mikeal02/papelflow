/**
 * Intelligence Cache — persistent + in-memory cache for elite analytics.
 *
 * Strategy:
 *  - Each user has a versioned snapshot keyed by a content hash of (id, updated_at, amount).
 *  - When new transactions arrive, we diff against the prior fingerprint set.
 *    If the diff is small (< INCREMENTAL_THRESHOLD), we keep the cached report
 *    and let the rules engine merge incremental deltas. Otherwise we trigger
 *    a full recompute in the worker.
 *  - Snapshots are persisted to localStorage so warm reloads are instant.
 */

import type { EliteAnomalyReport } from './anomalyElite';
import type { MerchantReport } from './merchantElite';

export const INCREMENTAL_THRESHOLD = 25;
const STORAGE_PREFIX = 'lov:intel:v2:';
const MAX_AGE_MS = 1000 * 60 * 60 * 24; // 1 day

export interface TxFingerprint {
  id: string;
  hash: string; // amount|updated_at|payee
}

export interface CachedReport {
  fingerprints: TxFingerprint[];
  fingerprintMap: Record<string, string>;
  anomalies: EliteAnomalyReport;
  merchants: MerchantReport;
  computedAt: number;
  durationMs: number;
  version: number;
}

export interface DiffSummary {
  added: any[];
  removed: string[];
  changed: any[];
  unchanged: number;
  ratio: number; // 0..1 portion of touched txs
}

export function fingerprintTx(t: any): string {
  return `${Number(t.amount).toFixed(2)}|${t.updated_at || t.created_at || ''}|${(t.payee || '').slice(0, 32)}`;
}

export function buildFingerprintMap(txs: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of txs) map[t.id] = fingerprintTx(t);
  return map;
}

export function diffTransactions(
  current: any[],
  prior: Record<string, string> | null
): DiffSummary {
  if (!prior) {
    return { added: current, removed: [], changed: [], unchanged: 0, ratio: 1 };
  }
  const currentMap = new Map<string, any>();
  for (const t of current) currentMap.set(t.id, t);

  const added: any[] = [];
  const changed: any[] = [];
  let unchanged = 0;
  for (const [id, tx] of currentMap.entries()) {
    const fp = fingerprintTx(tx);
    const prev = prior[id];
    if (!prev) added.push(tx);
    else if (prev !== fp) changed.push(tx);
    else unchanged++;
  }
  const removed: string[] = [];
  for (const id of Object.keys(prior)) {
    if (!currentMap.has(id)) removed.push(id);
  }
  const touched = added.length + changed.length + removed.length;
  const ratio = currentMap.size > 0 ? touched / currentMap.size : 1;
  return { added, removed, changed, unchanged, ratio };
}

export function shouldIncremental(diff: DiffSummary): boolean {
  if (diff.removed.length > 0) return false;
  if (diff.changed.length > 0) return false;
  if (diff.added.length === 0) return false;
  return diff.added.length <= INCREMENTAL_THRESHOLD && diff.ratio < 0.1;
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

const mem = new Map<string, CachedReport>();

export function loadCache(userId: string): CachedReport | null {
  if (mem.has(userId)) return mem.get(userId)!;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed: CachedReport = JSON.parse(raw);
    if (Date.now() - parsed.computedAt > MAX_AGE_MS) return null;
    mem.set(userId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function saveCache(userId: string, report: CachedReport) {
  mem.set(userId, report);
  try {
    // Strip non-serializable extras and bound size
    const slim: CachedReport = {
      ...report,
      fingerprints: report.fingerprints.slice(0, 5000),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(slim));
  } catch {
    // ignore quota errors; mem cache still works
  }
}

export function clearCache(userId: string) {
  mem.delete(userId);
  try { localStorage.removeItem(storageKey(userId)); } catch {}
}
