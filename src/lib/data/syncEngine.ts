/**
 * Sync engine — hydrates IDB from the server, subscribes to Realtime deltas,
 * reconciles server rows into local repositories, and invalidates React Query
 * caches so existing hooks pick up authoritative data.
 *
 * Sync strategy
 * -------------
 * Two complementary passes, because neither alone is correct:
 *
 *  - **Delta sync** (`updated_at > cursor`) is cheap and runs on every boot,
 *    but it is structurally blind to deletions — a row removed elsewhere
 *    simply stops appearing and would live on in IDB indefinitely.
 *  - **Full reconcile** pulls the whole snapshot and tombstones local rows the
 *    server no longer has. It is the expensive path, so it runs on first sync
 *    and then at most once per `RECONCILE_INTERVAL_MS`.
 *
 * Both paths are per-table isolated: one failing table degrades to a full
 * hydrate for that table only and never aborts the others.
 */
import { supabase } from '@/integrations/supabase/client';
import type { QueryClient } from '@tanstack/react-query';
import { repos } from './repositories';
import { getDB } from './db';
import { qk, invalidateDomains, type Domain } from '@/lib/queryKeys';

const TABLES = ['transactions', 'accounts', 'budgets', 'goals', 'subscriptions', 'categories'] as const;
type Tbl = typeof TABLES[number];

/** How long a delta-only cursor may run before a deletion-aware full pass. */
const RECONCILE_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Page size for snapshot pulls — keeps any single request bounded. */
const PAGE = 1000;
/** Coalescing window for Realtime bursts (bulk imports, trigger cascades). */
const REALTIME_FLUSH_MS = 350;

/** Maps a synced table to its cache domain so dependents refresh too. */
const TABLE_DOMAIN: Record<Tbl, Domain> = {
  transactions: 'transactions',
  accounts: 'accounts',
  budgets: 'budgets',
  goals: 'goals',
  subscriptions: 'subscriptions',
  categories: 'categories',
};

export interface SyncOutcome {
  table: Tbl;
  mode: 'delta' | 'reconcile';
  changed: number;
  tombstoned: number;
  error?: string;
}

/** Pull every row for the user, paged, so large histories stay bounded. */
async function fetchAll(userId: string, table: Tbl): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table as any).select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as any[];
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

/** Deletion-aware full pass. */
async function reconcile(userId: string, table: Tbl): Promise<SyncOutcome> {
  const rows = await fetchAll(userId, table);
  const { tombstoned } = await repos(userId)[table].reconcileSnapshot(rows);
  const db = await getDB(userId);
  await db.put('sync_cursors', {
    table,
    lastSyncedAt: rows.reduce(
      (max: string, r: any) => (r.updated_at && r.updated_at > max ? r.updated_at : max),
      new Date(0).toISOString(),
    ),
    lastFullReconcileAt: Date.now(),
  });
  return { table, mode: 'reconcile', changed: rows.length, tombstoned };
}

/** Cheap incremental pass; escalates to a reconcile when the cursor is stale. */
async function deltaSync(userId: string, table: Tbl): Promise<SyncOutcome> {
  const db = await getDB(userId);
  const cursor = await db.get('sync_cursors', table);
  if (!cursor) return reconcile(userId, table);
  if (Date.now() - (cursor.lastFullReconcileAt ?? 0) > RECONCILE_INTERVAL_MS) {
    return reconcile(userId, table);
  }
  const { data, error } = await supabase
    .from(table as any).select('*')
    .eq('user_id', userId)
    .gt('updated_at', cursor.lastSyncedAt)
    .order('updated_at', { ascending: true })
    .limit(PAGE);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (rows.length) {
    await repos(userId)[table].upsertFromServer(rows);
    const newest = rows.reduce(
      (max: string, row: any) => (row.updated_at && row.updated_at > max ? row.updated_at : max),
      cursor.lastSyncedAt,
    );
    await db.put('sync_cursors', { ...cursor, lastSyncedAt: newest });
  }
  // A saturated page means more deltas are waiting; keep walking the cursor.
  if (rows.length === PAGE) {
    const next = await deltaSync(userId, table);
    return { ...next, changed: next.changed + rows.length };
  }
  return { table, mode: 'delta', changed: rows.length, tombstoned: 0 };
}

export async function bootstrapSync(userId: string): Promise<SyncOutcome[]> {
  return Promise.all(
    TABLES.map(async t => {
      try {
        return await deltaSync(userId, t);
      } catch {
        try {
          return await reconcile(userId, t);
        } catch (e: any) {
          return { table: t, mode: 'reconcile' as const, changed: 0, tombstoned: 0, error: e?.message ?? String(e) };
        }
      }
    }),
  );
}

/** Force a deletion-aware pass across every table (manual resync / recovery). */
export async function forceReconcile(userId: string): Promise<SyncOutcome[]> {
  return Promise.all(TABLES.map(t => reconcile(userId, t).catch((e: any) => ({
    table: t, mode: 'reconcile' as const, changed: 0, tombstoned: 0, error: e?.message ?? String(e),
  }))));
}

export function subscribeRealtime(userId: string, qc: QueryClient) {
  const channel = supabase.channel(`pipeline:${userId}`);

  // Coalesce invalidations: a CSV import or a balance trigger cascade can emit
  // dozens of events in a few ms, and one invalidation per event would restart
  // every dependent query that many times.
  const dirty = new Set<Tbl>();
  let flushTimer: number | null = null;
  const flush = () => {
    flushTimer = null;
    if (!dirty.size) return;
    const tables = [...dirty];
    dirty.clear();
    invalidateDomains(qc, ...tables.map(t => TABLE_DOMAIN[t]));
    for (const t of tables) qc.invalidateQueries({ queryKey: qk.pipeline(t) });
  };
  const markDirty = (table: Tbl) => {
    dirty.add(table);
    if (flushTimer === null) flushTimer = window.setTimeout(flush, REALTIME_FLUSH_MS);
  };

  for (const table of TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      async (payload: any) => {
        try {
          const r = repos(userId)[table];
          if (payload.eventType === 'DELETE') {
            if (payload.old?.id) await r.removeFromServer(payload.old.id);
          } else if (payload.new) {
            await r.upsertFromServer(payload.new);
          }
        } catch {
          // A failed local apply must not kill the channel; the next
          // reconcile pass repairs divergence.
        }
        markDirty(table);
      },
    );
  }

  // The first SUBSCRIBED follows the caller's own bootstrap; only *re*-subscribes
  // (sleep/wake, network change) indicate a gap that needs catching up.
  let subscribedOnce = false;
  channel.subscribe(status => {
    if (status !== 'SUBSCRIBED') return;
    if (!subscribedOnce) { subscribedOnce = true; return; }
    {
      void bootstrapSync(userId).then(() => {
        for (const t of TABLES) markDirty(t);
      });
    }
  });

  return () => {
    if (flushTimer !== null) window.clearTimeout(flushTimer);
    supabase.removeChannel(channel);
  };
}
