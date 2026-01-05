import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Subscription = Tables<'subscriptions'>;
export type SubscriptionInsert = TablesInsert<'subscriptions'>;
export type SubscriptionUpdate = TablesUpdate<'subscriptions'>;

export function useSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          category:categories(id, name, icon, color),
          account:accounts(id, name)
        `)
        .order('next_due', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (subscription: Omit<SubscriptionInsert, 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({ ...subscription, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add subscription', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...subscription }: SubscriptionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .update(subscription)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update subscription', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Subscription deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete subscription', description: error.message, variant: 'destructive' });
    },
  });
}
