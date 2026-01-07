import { createContext, useContext, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';

interface CurrencyContextType {
  currency: string;
  formatCurrency: (amount: number, showSign?: boolean) => string;
  currencySymbol: string;
}

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'Fr',
  KRW: '₩',
  SGD: 'S$',
  BRL: 'R$',
  MXN: 'Mex$',
  AED: 'د.إ',
  SAR: '﷼',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const currency = profile?.preferred_currency || 'USD';
  const currencySymbol = currencySymbols[currency] || '$';

  const formatCurrency = (amount: number, showSign?: boolean): string => {
    const absAmount = Math.abs(amount);
    const formattedNumber = absAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    const prefix = showSign ? (amount < 0 ? '-' : amount > 0 ? '+' : '') : (amount < 0 ? '-' : '');
    return `${prefix}${currencySymbol}${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, formatCurrency, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
