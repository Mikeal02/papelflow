import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { qk, invalidateDomains } from '@/lib/queryKeys';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'>;
export type TransactionInsert = TablesInsert<'transactions'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

/**
 * Default window for widget-level consumers (dashboard cards, insights).
 * Pages that page/filter over history pass a larger explicit limit — the limit
 * is part of the cache key, so a wide fetch does not evict the narrow one.
 */
export const DEFAULT_TX_LIMIT = 500;
/** Full-history window used by the Transactions page's client-side paging. */
export const HISTORY_TX_LIMIT = 2000;

const TX_SELECT = `
  *,
  account:accounts!transactions_account_id_fkey(id, name, type, color),
  category:categories(id, name, icon, color, type),
  to_account:accounts!transactions_to_account_id_fkey(id, name, type, color)
`;

export function useTransactions(limit: number = DEFAULT_TX_LIMIT) {
  const { user } = useAuth();

  return useQuery({
    queryKey: qk.transactions(user?.id, limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(TX_SELECT)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Omit<TransactionInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      // Account balances are maintained by the `trg_tx_sync_account_balances`
      // database trigger. Doing it here as read-modify-write was racy (two
      // concurrent writes lost one another's delta) and silently skipped
      // rebalancing on edit/delete.
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDomains(queryClient, 'transactions');
      toast({ title: 'Transaction added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add transaction', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TransactionUpdate }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateDomains(queryClient, 'transactions');
      toast({ title: 'Transaction updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update transaction', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateDomains(queryClient, 'transactions');
      toast({ title: 'Transaction deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete transaction', description: error.message, variant: 'destructive' });
    },
  });
}

export function useMonthlyStats() {
  const { user } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: qk.monthlyStats(user?.id, currentMonth),
    queryFn: async () => {
      const startOfMonth = `${currentMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).setMonth(new Date(startOfMonth).getMonth() + 1) - 1)
        .toISOString()
        .split('T')[0];

      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (error) throw error;

      // Single pass instead of two filter+reduce sweeps over the same rows.
      let income = 0;
      let expenses = 0;
      for (const t of data) {
        if (t.type === 'income') income += Number(t.amount);
        else if (t.type === 'expense') expenses += Number(t.amount);
      }

      return { income, expenses, netFlow: income - expenses };
    },
    enabled: !!user,
  });
}
