import { useEffect, useCallback, useRef } from 'react';
import { useSubscriptions, useUpdateSubscription } from './useSubscriptions';
import { useCreateTransaction } from './useTransactions';
import { useAccounts } from './useAccounts';
import { toast } from 'sonner';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, isBefore } from 'date-fns';

const PROCESSED_KEY = 'processed_recurring_transactions';

interface ProcessedTransaction {
  subscriptionId: string;
  date: string;
}

export const useRecurringTransactions = () => {
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  const updateSubscription = useUpdateSubscription();
  const hasProcessed = useRef(false);

  const getProcessedTransactions = useCallback((): ProcessedTransaction[] => {
    try {
      const stored = localStorage.getItem(PROCESSED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const markAsProcessed = useCallback((subscriptionId: string, date: string) => {
    const processed = getProcessedTransactions();
    processed.push({ subscriptionId, date });
    const trimmed = processed.slice(-200);
    localStorage.setItem(PROCESSED_KEY, JSON.stringify(trimmed));
  }, [getProcessedTransactions]);

  const isAlreadyProcessed = useCallback((subscriptionId: string, date: string): boolean => {
    const processed = getProcessedTransactions();
    return processed.some(p => p.subscriptionId === subscriptionId && p.date === date);
  }, [getProcessedTransactions]);

  const getNextDueDate = useCallback((currentDue: Date, frequency: string): Date => {
    switch (frequency) {
      case 'weekly': return addWeeks(currentDue, 1);
      case 'monthly': return addMonths(currentDue, 1);
      case 'yearly': return addYears(currentDue, 1);
      default: return addMonths(currentDue, 1);
    }
  }, []);

  const processRecurringTransactions = useCallback(async () => {
    if (hasProcessed.current) return;
    
    const activeSubscriptions = subscriptions.filter(s => s.is_active);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Need at least one account to create transactions
    const defaultAccount = accounts.find(a => a.is_active) || accounts[0];
    if (!defaultAccount) return;

    let processedCount = 0;

    for (const subscription of activeSubscriptions) {
      let dueDate = parseISO(subscription.next_due);
      dueDate.setHours(0, 0, 0, 0);

      // Process all missed dates up to today
      let iterationCount = 0;
      while (isBefore(dueDate, addDays(today, 1)) && iterationCount < 12) {
        iterationCount++;
        const dateKey = format(dueDate, 'yyyy-MM-dd');

        if (isAlreadyProcessed(subscription.id, dateKey)) {
          dueDate = getNextDueDate(dueDate, subscription.frequency);
          continue;
        }

        try {
          const accountId = subscription.account_id || defaultAccount.id;

          await createTransaction.mutateAsync({
            type: 'expense',
            amount: subscription.amount,
            date: dateKey,
            account_id: accountId,
            category_id: subscription.category_id,
            payee: subscription.name,
            notes: `Auto-generated: ${subscription.name} (${subscription.frequency})`,
            is_recurring: true,
          });

          markAsProcessed(subscription.id, dateKey);
          processedCount++;
        } catch (error) {
          console.error(`Failed to create recurring transaction for ${subscription.name}:`, error);
        }

        dueDate = getNextDueDate(dueDate, subscription.frequency);
      }

      // Advance the subscription's next_due to the future
      const newNextDue = format(dueDate, 'yyyy-MM-dd');
      if (newNextDue !== subscription.next_due) {
        try {
          await updateSubscription.mutateAsync({
            id: subscription.id,
            next_due: newNextDue,
          });
        } catch (error) {
          console.error(`Failed to update next_due for ${subscription.name}:`, error);
        }
      }
    }

    if (processedCount > 0) {
      toast.success(`${processedCount} recurring transaction${processedCount > 1 ? 's' : ''} auto-generated`);
    }

    hasProcessed.current = true;
  }, [subscriptions, accounts, createTransaction, updateSubscription, isAlreadyProcessed, markAsProcessed, getNextDueDate]);

  useEffect(() => {
    if (subscriptions.length > 0 && accounts.length > 0) {
      processRecurringTransactions();
    }
  }, [subscriptions.length, accounts.length]);

  return {
    processRecurringTransactions,
    subscriptionsCount: subscriptions.filter(s => s.is_active).length,
  };
};
