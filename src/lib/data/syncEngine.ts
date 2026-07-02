/**
 * Sync engine — hydrates IDB from server, subscribes to Realtime deltas,
 * reconciles server rows back into local repositories, and invalidates
 * React Query caches so existing hooks pick up authoritative data.
 */
import { supabase } from '@/integrations/supabase/client';
import type { QueryClient } from '@tanstack/react-query';
import { repos } from './repositories';
import { getDB } from './db';

const TABLES = ['transactions', 'accounts', 'budgets', 'goals', 'subscriptions', 'categories'] as const;
type Tbl = typeof TABLES[number];

async function fullHydrate(userId: string, table: Tbl) {
  const { data, error } = await supabase.from(table as any).select('*').eq('user_id', userId);
  if (error) throw error;
  const r = repos(userId)[table];
  await r.upsertFromServer(data as any[]);
  const db = await getDB(userId);
  await db.put('sync_cursors', {
    table, lastSyncedAt: new Date().toISOString(), lastFullReconcileAt: Date.now(),
  });
}

async function deltaSync(userId: string, table: Tbl) {
  const db = await getDB(userId);
  const cursor = await db.get('sync_cursors', table);
  if (!cursor) return fullHydrate(userId, table);
  const { data, error } = await supabase
    .from(table as any).select('*')
    .eq('user_id', userId)
    .gt('updated_at', cursor.lastSyncedAt);
  if (error) throw error;
  if (data && data.length) {
    const r = repos(userId)[table];
    await r.upsertFromServer(data as any[]);
    const newest = data.reduce((max: string, row: any) =>
      row.updated_at && row.updated_at > max ? row.updated_at : max, cursor.lastSyncedAt);
    await db.put('sync_cursors', { ...cursor, lastSyncedAt: newest });
  }
}

export async function bootstrapSync(userId: string) {
  await Promise.all(TABLES.map(t => deltaSync(userId, t).catch(() => fullHydrate(userId, t))));
}

export function subscribeRealtime(userId: string, qc: QueryClient) {
  const channel = supabase.channel(`pipeline:${userId}`);
  for (const table of TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` },
      async (payload: any) => {
        const r = repos(userId)[table];
        if (payload.eventType === 'DELETE') {
          await r.removeFromServer(payload.old.id);
        } else if (payload.new) {
          await r.upsertFromServer(payload.new);
        }
        qc.invalidateQueries({ queryKey: [table] });
        qc.invalidateQueries({ queryKey: ['monthly-stats'] });
        qc.invalidateQueries({ queryKey: ['pipeline', table] });
        qc.invalidateQueries({ queryKey: ['aggregations'] });
      }
    );
  }
  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}
