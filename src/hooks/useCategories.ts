import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Category = Tables<'categories'>;
export type CategoryInsert = TablesInsert<'categories'>;
export type CategoryUpdate = TablesUpdate<'categories'>;

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      // First fetch existing categories
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Check if income categories exist, if not, add them
      const hasIncomeCategories = data?.some(c => c.type === 'income');
      if (!hasIncomeCategories && user) {
        await supabase.rpc('add_income_categories_for_user', { p_user_id: user.id });
        // Refetch after adding income categories
        const { data: refreshedData, error: refreshError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });
        if (refreshError) throw refreshError;
        return refreshedData as Category[];
      }

      return data as Category[];
    },
    enabled: !!user,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (category: Omit<CategoryInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create category', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete category', description: error.message, variant: 'destructive' });
    },
  });
}
