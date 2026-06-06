/// <reference lib="webworker" />
/**
 * Background worker: runs anomalyElite + merchantElite off the main thread.
 * Supports full recompute and incremental "merge new transactions" mode.
 */

import { runEliteAnomalies } from './anomalyElite';
import { runMerchantElite } from './merchantElite';

export interface WorkerRequest {
  id: string;
  type: 'full' | 'incremental';
  transactions: any[];
  newTransactions?: any[];
}

export interface WorkerResponse {
  id: string;
  ok: boolean;
  durationMs: number;
  error?: string;
  anomalies?: ReturnType<typeof runEliteAnomalies>;
  merchants?: ReturnType<typeof runMerchantElite>;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, type, transactions, newTransactions } = e.data;
  const t0 = performance.now();
  try {
    // For incremental, we still run the full pipeline because both engines
    // depend on global percentile/HHI/RFM statistics. The cache layer uses
    // the new-txs subset only for rules-engine deltas.
    void type;
    void newTransactions;
    const anomalies = runEliteAnomalies(transactions);
    const merchants = runMerchantElite(transactions);
    const res: WorkerResponse = {
      id, ok: true,
      durationMs: Math.round(performance.now() - t0),
      anomalies, merchants,
    };
    (self as any).postMessage(res);
  } catch (err: any) {
    const res: WorkerResponse = {
      id, ok: false,
      durationMs: Math.round(performance.now() - t0),
      error: err?.message || String(err),
    };
    (self as any).postMessage(res);
  }
};

export {};
