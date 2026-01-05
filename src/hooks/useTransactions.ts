import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Transaction = Tables<'transactions'>;
export type TransactionInsert = TablesInsert<'transactions'>;
export type TransactionUpdate = TablesUpdate<'transactions'>;

export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts(id, name, type, color),
          category:categories(id, name, icon, color, type),
          to_account:accounts!transactions_to_account_id_fkey(id, name, type, color)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100);

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

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

      if (error) throw error;

      // Update account balances manually
      const amount = Number(transaction.amount);
      
      if (transaction.type === 'expense') {
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single();
        
        if (account) {
          await supabase
            .from('accounts')
            .update({ balance: Number(account.balance) - amount })
            .eq('id', transaction.account_id);
        }
      } else if (transaction.type === 'income') {
        const { data: account } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single();
        
        if (account) {
          await supabase
            .from('accounts')
            .update({ balance: Number(account.balance) + amount })
            .eq('id', transaction.account_id);
        }
      } else if (transaction.type === 'transfer' && transaction.to_account_id) {
        // Deduct from source
        const { data: sourceAccount } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.account_id)
          .single();
        
        if (sourceAccount) {
          await supabase
            .from('accounts')
            .update({ balance: Number(sourceAccount.balance) - amount })
            .eq('id', transaction.account_id);
        }

        // Add to destination
        const { data: destAccount } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', transaction.to_account_id)
          .single();
        
        if (destAccount) {
          await supabase
            .from('accounts')
            .update({ balance: Number(destAccount.balance) + amount })
            .eq('id', transaction.to_account_id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({ title: 'Transaction added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add transaction', description: error.message, variant: 'destructive' });
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
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
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
    queryKey: ['monthly-stats', user?.id, currentMonth],
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

      const income = data
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const expenses = data
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        income,
        expenses,
        netFlow: income - expenses,
      };
    },
    enabled: !!user,
  });
}
