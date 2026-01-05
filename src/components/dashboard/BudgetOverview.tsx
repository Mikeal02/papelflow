import { motion } from 'framer-motion';
import { mockBudgets, mockCategories } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export function BudgetOverview() {
  const budgetsWithCategories = mockBudgets.map((budget) => ({
    ...budget,
    category: mockCategories.find((c) => c.id === budget.categoryId)!,
    percentage: Math.min((budget.spent / budget.amount) * 100, 100),
  }));

  const sortedBudgets = [...budgetsWithCategories].sort(
    (a, b) => b.percentage - a.percentage
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold">Budget Status</h3>
        <span className="text-sm text-muted-foreground">January 2026</span>
      </div>

      <div className="space-y-4">
        {sortedBudgets.slice(0, 5).map((budget, index) => {
          const isOverBudget = budget.spent > budget.amount;
          const isNearLimit = budget.percentage >= 80 && !isOverBudget;

          return (
            <motion.div
              key={budget.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{budget.category.name}</span>
                <span
                  className={cn(
                    'font-medium',
                    isOverBudget && 'text-expense',
                    isNearLimit && 'text-warning',
                    !isOverBudget && !isNearLimit && 'text-muted-foreground'
                  )}
                >
                  ${budget.spent.toFixed(0)} / ${budget.amount}
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
    </motion.div>
  );
}
