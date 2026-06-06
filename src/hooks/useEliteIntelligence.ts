import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions';
import {
  buildFingerprintMap, diffTransactions, loadCache, saveCache, shouldIncremental,
  type CachedReport, type DiffSummary,
} from '@/lib/intelligence/intelligenceCache';
import type { EliteAnomalyReport } from '@/lib/intelligence/anomalyElite';
import type { MerchantReport } from '@/lib/intelligence/merchantElite';
import { evaluateRules, type DraftAlert, type ExistingAlert } from '@/lib/intelligence/rulesEngine';

type WorkerResp = {
  id: string; ok: boolean; durationMs: number; error?: string;
  anomalies?: EliteAnomalyReport; merchants?: MerchantReport;
};

interface State {
  loading: boolean;
  anomalies: EliteAnomalyReport | null;
  merchants: MerchantReport | null;
  diff: DiffSummary | null;
  durationMs: number;
  computedAt: number;
  mode: 'cold' | 'cached' | 'incremental' | 'full';
}

function makeWorker(): Worker | null {
  try {
    return new Worker(
      new URL('../lib/intelligence/intelligence.worker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch {
    return null;
  }
}

export function useEliteIntelligence() {
  const { user } = useAuth();
  const { data: transactions = [] } = useTransactions();
  const queryClient = useQueryClient();

  const [state, setState] = useState<State>({
    loading: true, anomalies: null, merchants: null, diff: null,
    durationMs: 0, computedAt: 0, mode: 'cold',
  });

  const workerRef = useRef<Worker | null>(null);
  const inflightRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);

  // Load cache on mount
  useEffect(() => {
    if (!user) return;
    const cached = loadCache(user.id);
    if (cached) {
      setState(s => ({
        ...s, anomalies: cached.anomalies, merchants: cached.merchants,
        loading: false, computedAt: cached.computedAt, durationMs: cached.durationMs,
        mode: 'cached',
      }));
    }
  }, [user?.id]);

  // Spin up worker once
  useEffect(() => {
    workerRef.current = makeWorker();
    return () => { workerRef.current?.terminate(); workerRef.current = null; };
  }, []);

  // Trigger compute on tx change
  useEffect(() => {
    if (!user || !workerRef.current || !transactions) return;
    const txs = transactions as any[];
    const cached = loadCache(user.id);
    const diff = diffTransactions(txs, cached?.fingerprintMap || null);

    // Nothing changed → keep cached
    if (cached && diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
      setState(s => ({ ...s, diff, loading: false, mode: 'cached' }));
      return;
    }

    const incremental = cached && shouldIncremental(diff);
    const reqId = `r${++reqIdRef.current}`;
    inflightRef.current = reqId;
    setState(s => ({ ...s, loading: true, diff }));

    const onMsg = (e: MessageEvent<WorkerResp>) => {
      if (e.data.id !== reqId) return;
      workerRef.current?.removeEventListener('message', onMsg);
      if (!e.data.ok || !e.data.anomalies || !e.data.merchants) {
        setState(s => ({ ...s, loading: false }));
        return;
      }
      const fpMap = buildFingerprintMap(txs);
      const cachePayload: CachedReport = {
        fingerprints: Object.entries(fpMap).map(([id, hash]) => ({ id, hash })),
        fingerprintMap: fpMap,
        anomalies: e.data.anomalies,
        merchants: e.data.merchants,
        computedAt: Date.now(),
        durationMs: e.data.durationMs,
        version: 2,
      };
      saveCache(user.id, cachePayload);
      setState({
        loading: false,
        anomalies: e.data.anomalies,
        merchants: e.data.merchants,
        diff,
        durationMs: e.data.durationMs,
        computedAt: cachePayload.computedAt,
        mode: incremental ? 'incremental' : 'full',
      });
      // Trigger alerts sync
      queryClient.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    };
    workerRef.current.addEventListener('message', onMsg);
    workerRef.current.postMessage({
      id: reqId,
      type: incremental ? 'incremental' : 'full',
      transactions: txs,
      newTransactions: diff.added,
    });
  }, [transactions, user?.id, queryClient]);

  // Sync alerts whenever new report arrives
  useEffect(() => {
    if (!user || !state.anomalies || !state.merchants) return;
    void syncAlerts(user.id, state.anomalies, state.merchants).then(() => {
      queryClient.invalidateQueries({ queryKey: ['intelligence-alerts'] });
    });
  }, [user?.id, state.computedAt]);

  return state;
}

async function syncAlerts(
  userId: string,
  anomalies: EliteAnomalyReport,
  merchants: MerchantReport,
) {
  const { data: existing } = await supabase
    .from('intelligence_alerts')
    .select('dedup_key, acknowledged_at, dismissed_at, snooze_until, fired_count, severity')
    .eq('user_id', userId);

  const ex: ExistingAlert[] = (existing || []) as any;
  const { upserts } = evaluateRules(anomalies, merchants, ex, {
    quietHourStart: 22, quietHourEnd: 7, maxPerRun: 40,
  });

  if (upserts.length === 0) return;

  const exMap = new Map(ex.map(e => [e.dedup_key, e]));
  const rows = upserts.map((u: DraftAlert) => {
    const prev = exMap.get(u.dedupKey);
    return {
      user_id: userId,
      dedup_key: u.dedupKey,
      kind: u.kind,
      severity: u.severity,
      title: u.title,
      body: u.body,
      payload: u.payload,
      scheduled_for: u.scheduledFor,
      fired_count: (prev?.fired_count ?? 0) + 1,
      last_fired_at: new Date().toISOString(),
    };
  });

  await supabase
    .from('intelligence_alerts')
    .upsert(rows, { onConflict: 'user_id,dedup_key' });
}

export function useIntelligenceAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['intelligence-alerts', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intelligence_alerts')
        .select('*')
        .eq('user_id', user!.id)
        .is('dismissed_at', null)
        .order('scheduled_for', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
