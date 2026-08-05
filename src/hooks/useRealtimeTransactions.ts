import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { invalidateDomains } from '@/lib/queryKeys';

/**
 * Live transaction/account sync.
 *
 * Bursty writes (CSV import, recurring-transaction catch-up, bulk delete) used
 * to fire one invalidation per row, refetching the whole transaction list
 * dozens of times in a second. Events are now coalesced into a single trailing
 * flush, and the channel name is per-user so two mounted consumers cannot
 * collide on one topic.
 */
const FLUSH_MS = 400;

export function useRealtimeTransactions() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const pending = new Set<'transactions' | 'accounts'>();

    const flush = () => {
      timer.current = null;
      if (pending.size === 0) return;
      const domains = [...pending];
      pending.clear();
      invalidateDomains(queryClient, ...domains);
    };

    const schedule = (domain: 'transactions' | 'accounts') => {
      pending.add(domain);
      if (timer.current) return;
      timer.current = setTimeout(flush, FLUSH_MS);
    };

    const channel = supabase
      .channel(`realtime-transactions:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          schedule('transactions');

          if (payload.eventType === 'INSERT') {
            const row = payload.new as { payee?: string | null; amount?: number | string };
            toast({
              title: 'New transaction synced',
              description: `${row.payee || 'Transaction'} — ${Number(row.amount ?? 0).toFixed(2)}`,
            });
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `user_id=eq.${user.id}` },
        () => schedule('accounts'),
      )
      .subscribe();

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
