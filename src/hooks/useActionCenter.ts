import { useMemo } from 'react';
import { useFinancialIntelligence } from './useFinancialIntelligence';
import { useTransactions } from './useTransactions';
import { useBudgets } from './useBudgets';
import { useSubscriptions } from './useSubscriptions';
import { useGoals } from './useGoals';
import { useAccounts } from './useAccounts';
import { generateActions, summarizeBySeverity, summarizeByCategory, totalEffortMinutes, totalImpact, type PriorityAction } from '@/lib/intelligence/actions';

export function useActionCenter(): {
  actions: PriorityAction[];
  counts: ReturnType<typeof summarizeBySeverity>;
  byCategory: ReturnType<typeof summarizeByCategory>;
  totalMinutes: number;
  totalImpact: number;
  total: number;
  isLoading: boolean;
} {
  const { report, isLoading: il } = useFinancialIntelligence();
  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: goals = [] } = useGoals();
  const { data: accounts = [] } = useAccounts();

  const actions = useMemo(() => {
    if (!report) return [];
    return generateActions({
      report,
      transactions: transactions as any[],
      budgets: budgets as any[],
      subscriptions: subscriptions as any[],
      goals: goals as any[],
      accounts: accounts as any[],
    });
  }, [report, transactions, budgets, subscriptions, goals, accounts]);

  return {
    actions,
    counts: summarizeBySeverity(actions),
    byCategory: summarizeByCategory(actions),
    totalMinutes: totalEffortMinutes(actions),
    totalImpact: totalImpact(actions),
    total: actions.length,
    isLoading: il,
  };
}
