import { motion } from 'framer-motion';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export function BudgetOverview() {
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  // Calculate actual spending per category for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const categorySpending = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth) && t.category_id)
    .reduce((acc, t) => {
      acc[t.category_id!] = (acc[t.category_id!] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const budgetsWithSpent = budgets
    .map((budget) => ({
      ...budget,
      spent: categorySpending[budget.category_id] || 0,
      percentage: Math.min(
        ((categorySpending[budget.category_id] || 0) / Number(budget.amount)) * 100,
        100
      ),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Budget Status</h3>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {budgetsWithSpent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No budgets set up yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetsWithSpent.map((budget, index) => {
            const isOverBudget = budget.spent > Number(budget.amount);
            const isNearLimit = budget.percentage >= 80 && !isOverBudget;

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium truncate flex-1">{(budget.category as any)?.name || 'Category'}</span>
                  <span
                    className={cn(
                      'font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[160px]',
                      isOverBudget && 'text-expense',
                      isNearLimit && 'text-warning',
                      !isOverBudget && !isNearLimit && 'text-muted-foreground'
                    )}
                    title={`${formatCurrency(budget.spent)} / ${formatCurrency(Number(budget.amount))}`}
                  >
                    {formatCurrency(budget.spent)} / {formatCurrency(Number(budget.amount))}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budget.percentage}%` }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.6, ease: 'easeOut' }}
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full',
                      isOverBudget && 'bg-expense',
                      isNearLimit && 'bg-warning',
                      !isOverBudget && !isNearLimit && 'bg-primary'
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
