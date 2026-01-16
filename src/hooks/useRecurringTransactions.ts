import { useEffect, useCallback } from 'react';
import { useSubscriptions } from './useSubscriptions';
import { useCreateTransaction } from './useTransactions';
import { toast } from 'sonner';
import { format, parseISO, addDays, addWeeks, addMonths, addYears, isBefore, isToday } from 'date-fns';

const PROCESSED_KEY = 'processed_recurring_transactions';

interface ProcessedTransaction {
  subscriptionId: string;
  date: string;
}

export const useRecurringTransactions = () => {
  const { data: subscriptions = [] } = useSubscriptions();
  const createTransaction = useCreateTransaction();

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
    
    // Keep only last 100 entries to prevent storage bloat
    const trimmed = processed.slice(-100);
    localStorage.setItem(PROCESSED_KEY, JSON.stringify(trimmed));
  }, [getProcessedTransactions]);

  const isAlreadyProcessed = useCallback((subscriptionId: string, date: string): boolean => {
    const processed = getProcessedTransactions();
    return processed.some(
      p => p.subscriptionId === subscriptionId && p.date === date
    );
  }, [getProcessedTransactions]);

  const getNextDueDate = useCallback((currentDue: Date, frequency: string): Date => {
    switch (frequency) {
      case 'weekly':
        return addWeeks(currentDue, 1);
      case 'monthly':
        return addMonths(currentDue, 1);
      case 'yearly':
        return addYears(currentDue, 1);
      default:
        return addMonths(currentDue, 1);
    }
  }, []);

  const processRecurringTransactions = useCallback(async () => {
    const activeSubscriptions = subscriptions.filter(s => s.is_active);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let processedCount = 0;

    for (const subscription of activeSubscriptions) {
      const dueDate = parseISO(subscription.next_due);
      dueDate.setHours(0, 0, 0, 0);

      // Check if due date is today or in the past
      if (isBefore(dueDate, addDays(today, 1))) {
        const dateKey = format(dueDate, 'yyyy-MM-dd');

        // Skip if already processed
        if (isAlreadyProcessed(subscription.id, dateKey)) {
          continue;
        }

        try {
          // Create the transaction
          await createTransaction.mutateAsync({
            type: 'expense',
            amount: subscription.amount,
            date: dateKey,
            account_id: subscription.account_id,
            category_id: subscription.category_id,
            payee: subscription.name,
            notes: `Recurring: ${subscription.name}`,
            is_recurring: true,
          });

          // Mark as processed
          markAsProcessed(subscription.id, dateKey);
          processedCount++;

        } catch (error) {
          console.error(`Failed to create recurring transaction for ${subscription.name}:`, error);
        }
      }
    }

    if (processedCount > 0) {
      toast.success(`${processedCount} recurring transaction${processedCount > 1 ? 's' : ''} created`);
    }
  }, [subscriptions, createTransaction, isAlreadyProcessed, markAsProcessed]);

  // Process on mount and when subscriptions change
  useEffect(() => {
    if (subscriptions.length > 0) {
      processRecurringTransactions();
    }
  }, [subscriptions.length]); // Only run when subscription count changes

  return {
    processRecurringTransactions,
    subscriptionsCount: subscriptions.filter(s => s.is_active).length,
  };
};
