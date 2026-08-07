/**
 * Offline mutation queue — durable, causally ordered, self-coalescing.
 *
 * Design
 * ------
 * Every write lands here before the network. Three properties matter and the
 * naive "flush oldest first" loop guaranteed none of them:
 *
 *  1. **Causal order per entity.** Mutations are grouped into lanes keyed by
 *     `${table}:${entityId}` and replayed in issue order (`seq`). A lane whose
 *     head is failing is *blocked* — later ops for that entity never overtake
 *     it, so an update can no longer hit the server before its own insert.
 *     Distinct lanes stay independent, so one poisoned row cannot stall
 *     everything else.
 *  2. **Coalescing.** Consecutive un-attempted writes to the same entity are
 *     folded: update+update merge patches, insert+update folds into the insert
 *     payload, and insert+delete annihilate without ever touching the network.
 *     Bulk edits and CSV imports collapse from hundreds of round-trips to one
 *     per row.
 *  3. **Terminal-failure classification.** Permanent rejections (RLS denial,
 *     constraint violation, malformed payload) are not retried 8 times with
 *     growing backoff — they are parked as `dead` so the UI can surface them.
 *
 * Backoff is exponential with full jitter to avoid thundering-herd retries
 * when a whole queue wakes up on reconnect.
 */
import { getDB, type QueuedMutation } from './db';
import { supabase } from '@/integrations/supabase/client';

const MAX_ATTEMPTS = 8;
const BACKOFF_BASE_MS = 1_500;
const BACKOFF_CAP_MS = 5 * 60_000;
const BATCH = 25;

type Listener = (state: QueueState) => void;
export interface QueueState {
  size: number;
  pending: number;
  failing: number;
  /** Exhausted or permanently rejected — needs user attention. */
  dead: number;
  /** Number of distinct entity lanes currently blocked behind a failure. */
  blockedLanes: number;
  draining: boolean;
  online: boolean;
  lastDrainAt: number | null;
  lastError: string | null;
}

const state: QueueState = {
  size: 0, pending: 0, failing: 0, dead: 0, blockedLanes: 0, draining: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastDrainAt: null, lastError: null,
};
const listeners = new Set<Listener>();

function emit() { listeners.forEach(l => l({ ...state })); }
export function subscribe(l: Listener) { listeners.add(l); l({ ...state }); return () => { listeners.delete(l); }; }
export function getState() { return { ...state }; }

/** Exponential backoff with full jitter. */
function backoff(attempts: number) {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

export function laneKey(table: string, entityId: string) { return `${table}:${entityId}`; }

/** Monotonic sequence, seeded from whatever survived the last session. */
let seqCounter = 0;
let seqSeeded = false;
async function nextSeq(userId: string): Promise<number> {
  if (!seqSeeded) {
    try {
      const db = await getDB(userId);
      const all = await db.getAll('mutation_queue');
      seqCounter = all.reduce((m, r) => Math.max(m, r.seq ?? r.createdAt ?? 0), 0);
    } catch { /* empty queue */ }
    seqSeeded = true;
  }
  return ++seqCounter;
}

function isTerminal(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('violates row-level security') ||
    m.includes('permission denied') ||
    m.includes('duplicate key value') ||
    m.includes('violates foreign key') ||
    m.includes('violates check constraint') ||
    m.includes('violates not-null') ||
    m.includes('invalid input syntax') ||
    m.includes('column') && m.includes('does not exist')
  );
}

async function refreshStats(userId: string) {
  const db = await getDB(userId);
  const all = await db.getAll('mutation_queue');
  const blocked = new Set<string>();
  let dead = 0;
  for (const m of all) {
    if (m.attempts >= MAX_ATTEMPTS) { dead++; blocked.add(m.entityKey); }
    else if (m.attempts > 0) blocked.add(m.entityKey);
  }
  state.size = all.length;
  state.pending = all.filter(m => m.attempts === 0).length;
  state.failing = all.filter(m => m.attempts > 0 && m.attempts < MAX_ATTEMPTS).length;
  state.dead = dead;
  state.blockedLanes = blocked.size;
  emit();
}

export type EnqueueInput =
  Omit<QueuedMutation, 'attempts' | 'nextAttemptAt' | 'createdAt' | 'id' | 'entityKey' | 'seq'> & { id?: string };

/**
 * Append a mutation, folding it into an existing un-attempted op for the same
 * entity when the two are semantically composable. Returns the record that
 * now represents the intent, or `null` when the write annihilated a pending
 * insert (local-only row deleted before it ever reached the server).
 */
export async function enqueue(m: EnqueueInput): Promise<QueuedMutation | null> {
  const db = await getDB(m.userId);
  const key = laneKey(m.table, m.entityId);
  const now = Date.now();

  const lane = (await db.getAllFromIndex('mutation_queue', 'by-entity', key))
    .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const head = lane[0];
  const tail = lane[lane.length - 1];
  // Only fold into ops that have not been dispatched yet — an in-flight or
  // failed op is already known to the server and must stay verbatim.
  const foldable = tail && tail.attempts === 0 ? tail : null;

  if (m.op === 'delete') {
    // A row created offline and deleted offline never needs a network trip.
    const insertPending = head && head.op === 'insert' && head.attempts === 0;
    const tx = db.transaction('mutation_queue', 'readwrite');
    for (const row of lane) await tx.store.delete(row.id);
    let record: QueuedMutation | null = null;
    if (!insertPending) {
      record = {
        id: m.id ?? crypto.randomUUID(),
        table: m.table, op: 'delete', entityId: m.entityId, entityKey: key,
        seq: await nextSeq(m.userId), payload: null, userId: m.userId,
        createdAt: now, attempts: 0, nextAttemptAt: now, lastError: null,
      };
      await tx.store.put(record);
    }
    await tx.done;
    await refreshStats(m.userId);
    if (record) void drain(m.userId);
    return record;
  }

  if (m.op === 'update' && foldable && (foldable.op === 'insert' || foldable.op === 'update')) {
    const merged: QueuedMutation = {
      ...foldable,
      payload: { ...(foldable.payload ?? {}), ...(m.payload ?? {}) },
      nextAttemptAt: now,
    };
    await db.put('mutation_queue', merged);
    await refreshStats(m.userId);
    void drain(m.userId);
    return merged;
  }

  const record: QueuedMutation = {
    id: m.id ?? crypto.randomUUID(),
    table: m.table, op: m.op, entityId: m.entityId, entityKey: key,
    seq: await nextSeq(m.userId), payload: m.payload, userId: m.userId,
    createdAt: now, attempts: 0, nextAttemptAt: now, lastError: null,
  };
  await db.put('mutation_queue', record);
  await refreshStats(m.userId);
  void drain(m.userId);
  return record;
}

async function apply(m: QueuedMutation): Promise<{ ok: true } | { ok: false; error: string; terminal: boolean }> {
  try {
    if (m.op === 'insert') {
      // Upsert: a retry after an ambiguous network failure must not duplicate.
      const { error } = await supabase.from(m.table as any).upsert(m.payload, { onConflict: 'id' });
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
    const error = e?.message ?? String(e);
    return { ok: false, error, terminal: isTerminal(error) };
  }
}

let draining = false;
export async function drain(userId: string) {
  if (draining || !state.online) return;
  draining = true;
  state.draining = true;
  emit();
  try {
    const db = await getDB(userId);
    let guard = 0;
    while (guard++ < 200) {
      const now = Date.now();
      const all = (await db.getAll('mutation_queue')).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
      if (all.length === 0) break;

      // Build the eligible frontier: the head of each lane, skipping lanes
      // whose head is dead or still cooling down.
      const seenLane = new Set<string>();
      const frontier: QueuedMutation[] = [];
      for (const m of all) {
        if (seenLane.has(m.entityKey)) continue; // preserve per-entity FIFO
        seenLane.add(m.entityKey);
        if (m.attempts >= MAX_ATTEMPTS) continue;
        if (m.nextAttemptAt > now) continue;
        frontier.push(m);
        if (frontier.length >= BATCH) break;
      }
      if (frontier.length === 0) break;

      // Lanes are independent, so flush the frontier concurrently but bounded.
      const results = await Promise.all(frontier.map(async m => ({ m, res: await apply(m) })));

      for (const { m, res } of results) {
        const fresh = await db.get('mutation_queue', m.id);
        if (!fresh) continue; // coalesced or purged mid-flight
        if (res.ok) {
          await db.delete('mutation_queue', m.id);
          continue;
        }
        const attempts = res.terminal ? MAX_ATTEMPTS : fresh.attempts + 1;
        await db.put('mutation_queue', {
          ...fresh,
          attempts,
          lastError: res.error,
          nextAttemptAt: attempts >= MAX_ATTEMPTS ? Number.MAX_SAFE_INTEGER : now + backoff(attempts),
        });
        state.lastError = res.error;
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
  const onVisible = () => { if (document.visibilityState === 'visible') void drain(userId); };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(() => { void drain(userId); }, 20_000);
  void refreshStats(userId);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}

export async function purgeQueue(userId: string) {
  const db = await getDB(userId);
  await db.clear('mutation_queue');
  await refreshStats(userId);
}

/** Rearm dead-lettered mutations for one more round of attempts. */
export async function retryDead(userId: string) {
  const db = await getDB(userId);
  const all = await db.getAll('mutation_queue');
  const tx = db.transaction('mutation_queue', 'readwrite');
  const now = Date.now();
  for (const m of all) {
    if (m.attempts >= MAX_ATTEMPTS) await tx.store.put({ ...m, attempts: 0, nextAttemptAt: now, lastError: null });
  }
  await tx.done;
  await refreshStats(userId);
  void drain(userId);
}

export async function listQueue(userId: string): Promise<QueuedMutation[]> {
  const db = await getDB(userId);
  return (await db.getAll('mutation_queue')).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}
