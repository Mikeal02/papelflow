import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRatesData {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export function useExchangeRates(baseCurrency: string = 'USD') {
  return useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async (): Promise<ExchangeRatesData> => {
      const { data, error } = await supabase.functions.invoke('exchange-rates', {
        body: { base: baseCurrency },
      });
      if (error) throw error;
      return data as ExchangeRatesData;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: 30 * 60 * 1000,
  });
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
  baseCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert from source to base, then base to target
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  if (baseCurrency === fromCurrency) {
    return amount * toRate;
  }
  if (baseCurrency === toCurrency) {
    return amount / fromRate;
  }
  
  // Cross-rate conversion
  const amountInBase = amount / fromRate;
  return amountInBase * toRate;
}
