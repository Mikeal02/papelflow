import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { sendBudgetAlert } from '@/lib/email-service';
import { toast } from '@/hooks/use-toast';

interface BudgetWithSpending {
  id: string;
  amount: number;
  category?: {
    name: string;
  } | null;
  spent: number;
  percentage: number;
}

export function useBudgetAlerts(budgets: BudgetWithSpending[]) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const alertedBudgets = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.email || budgets.length === 0) return;

    budgets.forEach(async (budget) => {
      const alertKey = `${budget.id}-${budget.percentage >= 100 ? '100' : '80'}`;
      
      // Skip if already alerted for this threshold
      if (alertedBudgets.current.has(alertKey)) return;

      // Check if budget exceeds 80% or 100%
      if (budget.percentage >= 80) {
        const isOverBudget = budget.percentage >= 100;
        
        // Show toast notification
        toast({
          title: isOverBudget ? '🚨 Budget Exceeded!' : '⚠️ Budget Warning',
          description: `${budget.category?.name || 'Budget'}: ${budget.percentage.toFixed(0)}% spent`,
          variant: isOverBudget ? 'destructive' : 'default',
        });

        // Mark as alerted to prevent duplicate notifications
        alertedBudgets.current.add(alertKey);

        // Try to send email alert (will work if Resend domain is verified)
        try {
          await sendBudgetAlert(
            user.email,
            user.user_metadata?.full_name || user.email.split('@')[0],
            {
              budgetName: budget.category?.name || 'Unknown',
              spent: budget.spent,
              limit: budget.amount,
              percentage: budget.percentage,
              currency: currency,
            }
          );
        } catch (error) {
          // Email sending may fail if domain not verified - that's okay
          console.log('Budget alert email not sent (domain may not be verified)');
        }
      }
    });
  }, [budgets, user, currency]);

  // Reset alerts when month changes
  const resetAlerts = () => {
    alertedBudgets.current.clear();
  };

  return { resetAlerts };
}
