import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { bootstrapSync, subscribeRealtime } from '@/lib/data/syncEngine';
import { bindOnlineEvents, drain, subscribe as subscribeQueue, type QueueState } from '@/lib/data/offlineQueue';
import { getDB } from '@/lib/data/db';
import { getUserKey, keyringInfo } from '@/lib/data/crypto';

export interface PipelineStatus {
  hydrated: boolean;
  hydratingError: string | null;
  queue: QueueState;
  lastHydratedAt: number | null;
  encryption: { enabled: boolean; keyCreatedAt: number | null };
}

/**
 * Orchestrates the client data pipeline:
 *   1. Opens the user's IDB
 *   2. Bootstraps a delta/full sync from Supabase into local repositories
 *   3. Subscribes to Realtime for authoritative deltas
 *   4. Drains the offline mutation queue with backoff + online listeners
 *   5. Exposes live status for UI indicators
 */
export function useDataPipeline(): PipelineStatus {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<PipelineStatus>({
    hydrated: false, hydratingError: null,
    queue: { size: 0, pending: 0, failing: 0, draining: false, online: true, lastDrainAt: null, lastError: null },
    lastHydratedAt: null,
    encryption: { enabled: false, keyCreatedAt: null },
  });
  const unsubs = useRef<Array<() => void>>([]);

  useEffect(() => {
    unsubs.current.forEach(u => u());
    unsubs.current = [];
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        await getDB(user.id); // ensure open
        await getUserKey(user.id); // provisions per-user AES-GCM key before any I/O
        const info = await keyringInfo(user.id);
        setStatus(s => ({ ...s, encryption: { enabled: info.hasKey, keyCreatedAt: info.createdAt } }));
        await bootstrapSync(user.id);
        if (cancelled) return;
        setStatus(s => ({ ...s, hydrated: true, lastHydratedAt: Date.now() }));
        qc.invalidateQueries();
        const unsubRealtime = subscribeRealtime(user.id, qc);
        const unsubOnline = bindOnlineEvents(user.id);
        const unsubQueue = subscribeQueue(q => setStatus(s => ({ ...s, queue: q })));
        unsubs.current.push(unsubRealtime, unsubOnline, unsubQueue);
        void drain(user.id);
      } catch (e: any) {
        if (!cancelled) setStatus(s => ({ ...s, hydratingError: e?.message ?? String(e) }));
      }
    })();

    return () => {
      cancelled = true;
      unsubs.current.forEach(u => u());
      unsubs.current = [];
    };
  }, [user?.id, qc]);

  return status;
}
