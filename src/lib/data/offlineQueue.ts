/**
 * Offline mutation queue — durable, deduped, exponential-backoff.
 *
 * Every write goes here first, then a drain loop attempts to flush to the
 * server. Failed attempts stay queued; successive failures increase the
 * next-attempt-at delay. Consumers subscribe for live status/count.
 */
import { getDB, type QueuedMutation } from './db';
import { supabase } from '@/integrations/supabase/client';

const MAX_ATTEMPTS = 8;
const BACKOFF_BASE_MS = 1_500;
const BACKOFF_CAP_MS = 5 * 60_000;

type Listener = (state: QueueState) => void;
export interface QueueState {
  size: number;
  pending: number;
  failing: number;
  draining: boolean;
  online: boolean;
  lastDrainAt: number | null;
  lastError: string | null;
}

const state: QueueState = {
  size: 0, pending: 0, failing: 0, draining: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastDrainAt: null, lastError: null,
};
const listeners = new Set<Listener>();

function emit() { listeners.forEach(l => l({ ...state })); }
export function subscribe(l: Listener) { listeners.add(l); l({ ...state }); return () => { listeners.delete(l); }; }
export function getState() { return { ...state }; }

function backoff(attempts: number) {
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1));
}

async function refreshStats(userId: string) {
  const db = await getDB(userId);
  const all = await db.getAll('mutation_queue');
  state.size = all.length;
  state.pending = all.filter(m => m.attempts === 0).length;
  state.failing = all.filter(m => m.attempts > 0).length;
  emit();
}

export async function enqueue(m: Omit<QueuedMutation, 'attempts' | 'nextAttemptAt' | 'createdAt' | 'id'> & { id?: string }): Promise<QueuedMutation> {
  const db = await getDB(m.userId);
  const now = Date.now();
  const record: QueuedMutation = {
    id: m.id ?? crypto.randomUUID(),
    table: m.table,
    op: m.op,
    entityId: m.entityId,
    payload: m.payload,
    userId: m.userId,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
  };
  await db.put('mutation_queue', record);
  await refreshStats(m.userId);
  void drain(m.userId);
  return record;
}

async function apply(m: QueuedMutation): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (m.op === 'insert') {
      const { error } = await supabase.from(m.table as any).insert(m.payload);
      if (error) throw error;
    } else if (m.op === 'update') {
      const { error } = await supabase.from(m.table as any).update(m.payload).eq('id', m.entityId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(m.table as any).delete().eq('id', m.entityId);
      if (error) throw error;
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

let draining = false;
export async function drain(userId: string) {
  if (draining) return;
  if (!state.online) return;
  draining = true;
  state.draining = true;
  emit();
  try {
    const db = await getDB(userId);
    while (true) {
      const now = Date.now();
      // pull earliest-eligible batch
      const idx = db.transaction('mutation_queue').store.index('by-next-attempt');
      const eligible: QueuedMutation[] = [];
      for await (const cur of idx.iterate()) {
        if (cur.value.nextAttemptAt <= now) eligible.push(cur.value);
        if (eligible.length >= 25) break;
      }
      if (eligible.length === 0) break;

      for (const m of eligible) {
        const res = await apply(m);
        const fresh = await db.get('mutation_queue', m.id);
        if (!fresh) continue; // was cleared elsewhere
        if (res.ok) {
          await db.delete('mutation_queue', m.id);
        } else {
          const attempts = fresh.attempts + 1;
          if (attempts >= MAX_ATTEMPTS) {
            // park permanently until manual intervention
            await db.put('mutation_queue', { ...fresh, attempts, lastError: res.error, nextAttemptAt: now + BACKOFF_CAP_MS });
            state.lastError = res.error;
          } else {
            await db.put('mutation_queue', { ...fresh, attempts, lastError: res.error, nextAttemptAt: now + backoff(attempts) });
          }
        }
      }
      await refreshStats(userId);
    }
    state.lastDrainAt = Date.now();
  } finally {
    draining = false;
    state.draining = false;
    emit();
  }
}

export function bindOnlineEvents(userId: string) {
  if (typeof window === 'undefined') return () => {};
  const onOnline = () => { state.online = true; emit(); void drain(userId); };
  const onOffline = () => { state.online = false; emit(); };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  const timer = window.setInterval(() => { void drain(userId); }, 20_000);
  void refreshStats(userId);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.clearInterval(timer);
  };
}

export async function purgeQueue(userId: string) {
  const db = await getDB(userId);
  await db.clear('mutation_queue');
  await refreshStats(userId);
}

export async function listQueue(userId: string): Promise<QueuedMutation[]> {
  const db = await getDB(userId);
  return db.getAll('mutation_queue');
}
