import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Budget = Tables<'budgets'>;
export type BudgetInsert = TablesInsert<'budgets'>;
export type BudgetUpdate = TablesUpdate<'budgets'>;

export function useBudgets(month?: string) {
  const { user } = useAuth();
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  return useQuery({
    queryKey: ['budgets', user?.id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          category:categories(id, name, icon, color, type, category_group)
        `)
        .eq('month', currentMonth);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (budget: Omit<BudgetInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('budgets')
        .insert({ ...budget, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: 'Budget created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create budget', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...budget }: BudgetUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(budget)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({ title: 'Budget updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update budget', description: error.message, variant: 'destructive' });
    },
  });
}
