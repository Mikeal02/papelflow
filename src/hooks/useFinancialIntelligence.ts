import { useMemo } from 'react';
import { useTransactions } from './useTransactions';
import { useAccounts } from './useAccounts';
import { useGoals } from './useGoals';
import { runIntelligence, type IntelligenceReport } from '@/lib/intelligence/engine';

/**
 * Memoized financial intelligence engine.
 * Recomputes only when transactions/accounts/goals data changes.
 */
export function useFinancialIntelligence(): {
  report: IntelligenceReport | null;
  isLoading: boolean;
} {
  const { data: transactions = [], isLoading: tl } = useTransactions();
  const { data: accounts = [], isLoading: al } = useAccounts();
  const { data: goals = [], isLoading: gl } = useGoals();

  const report = useMemo(() => {
    if (!transactions.length) return null;
    return runIntelligence(transactions as any[], accounts as any[], goals as any[]);
  }, [transactions, accounts, goals]);

  return { report, isLoading: tl || al || gl };
}
