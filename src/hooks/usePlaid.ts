import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PlaidAccount {
  account_id: string;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
  mask: string;
  name: string;
  official_name: string | null;
  subtype: string;
  type: string;
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean;
}

export function usePlaid() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const createLinkToken = useCallback(async () => {
    if (!user) return null;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('plaid', {
        body: { action: 'create_link_token', user_id: user.id },
      });

      if (error) throw error;
      if (data.needsSetup) {
        setNeedsSetup(true);
        return null;
      }
      if (data.error) throw new Error(data.error);

      setLinkToken(data.link_token);
      return data.link_token;
    } catch (error) {
      console.error('Create link token error:', error);
      toast({
        title: 'Failed to initialize bank connection',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const exchangePublicToken = useCallback(async (publicToken: string) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('plaid', {
        body: { action: 'exchange_public_token', public_token: publicToken },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return { accessToken: data.access_token, itemId: data.item_id };
    } catch (error) {
      console.error('Exchange token error:', error);
      toast({
        title: 'Failed to connect bank',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAccounts = useCallback(async (accessToken: string): Promise<PlaidAccount[] | null> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('plaid', {
        body: { action: 'get_accounts', access_token: accessToken },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.accounts;
    } catch (error) {
      console.error('Get accounts error:', error);
      toast({
        title: 'Failed to fetch accounts',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTransactions = useCallback(async (accessToken: string, cursor?: string) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('plaid', {
        body: { action: 'get_transactions', access_token: accessToken, cursor },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return {
        added: data.added as PlaidTransaction[],
        modified: data.modified as PlaidTransaction[],
        removed: data.removed as { transaction_id: string }[],
        nextCursor: data.next_cursor,
        hasMore: data.has_more,
      };
    } catch (error) {
      console.error('Get transactions error:', error);
      toast({
        title: 'Failed to sync transactions',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    linkToken,
    needsSetup,
    createLinkToken,
    exchangePublicToken,
    getAccounts,
    getTransactions,
  };
}
