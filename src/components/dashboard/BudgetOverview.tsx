import { motion } from 'framer-motion';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Loader2, PieChart, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

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
      rawPercentage: ((categorySpending[budget.category_id] || 0) / Number(budget.amount)) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  const totalBudget = budgetsWithSpent.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgetsWithSpent.reduce((s, b) => s + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="stat-card flex items-center justify-center min-h-[200px]"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-6 w-6 text-primary" />
          </motion.div>
          <p className="text-xs text-muted-foreground">Loading budgets...</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
      className="stat-card relative overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none" />
      
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <PieChart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Budget Status</h3>
            <p className="text-[10px] text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        {budgetsWithSpent.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "text-right px-3 py-1.5 rounded-lg",
              overallPercentage >= 90 ? "bg-expense/10" : overallPercentage >= 70 ? "bg-warning/10" : "bg-income/10"
            )}
          >
            <p className={cn(
              "text-lg font-bold",
              overallPercentage >= 90 ? "text-expense" : overallPercentage >= 70 ? "text-warning" : "text-income"
            )}>
              {overallPercentage.toFixed(0)}%
            </p>
            <p className="text-[9px] text-muted-foreground">Overall</p>
          </motion.div>
        )}
      </div>

      {budgetsWithSpent.length === 0 ? (
        <motion.div 
          className="flex flex-col items-center justify-center py-10 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div 
            className="relative mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
              <PieChart className="h-7 w-7 text-muted-foreground" />
            </div>
          </motion.div>
          <p className="text-sm font-medium mb-1">No budgets set up yet</p>
          <p className="text-xs text-muted-foreground">Create budgets to track spending</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {budgetsWithSpent.map((budget, index) => {
            const isOverBudget = budget.spent > Number(budget.amount);
            const isNearLimit = budget.percentage >= 80 && !isOverBudget;
            const isHealthy = budget.percentage < 80;

            return (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.06, type: 'spring', stiffness: 300 }}
                whileHover={{ x: 4 }}
                className="group"
              >
                <div className="flex items-center justify-between gap-2 text-sm mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center shrink-0",
                        isOverBudget && "bg-expense/20",
                        isNearLimit && "bg-warning/20",
                        isHealthy && "bg-income/20"
                      )}
                    >
                      {isOverBudget ? (
                        <AlertTriangle className="h-3 w-3 text-expense" />
                      ) : isNearLimit ? (
                        <TrendingUp className="h-3 w-3 text-warning" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-income" />
                      )}
                    </motion.div>
                    <span className="font-medium truncate">{(budget.category as any)?.name || 'Category'}</span>
                  </div>
                  <span
                    className={cn(
                      'font-semibold text-xs truncate max-w-[100px] sm:max-w-[140px] tabular-nums',
                      isOverBudget && 'text-expense',
                      isNearLimit && 'text-warning',
                      isHealthy && 'text-muted-foreground'
                    )}
                    title={`${formatCurrency(budget.spent)} / ${formatCurrency(Number(budget.amount))}`}
                  >
                    {formatCurrency(budget.spent)} / {formatCurrency(Number(budget.amount))}
                  </span>
                </div>
                
                {/* Premium progress bar */}
                <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
                  {/* Glow effect */}
                  <motion.div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full blur-sm opacity-50",
                      isOverBudget && 'bg-expense',
                      isNearLimit && 'bg-warning',
                      isHealthy && 'bg-primary'
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${budget.percentage}%` }}
                    transition={{ delay: 0.35 + index * 0.06, duration: 0.6, ease: 'easeOut' }}
                  />
                  
                  {/* Main bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budget.percentage}%` }}
                    transition={{ delay: 0.35 + index * 0.06, duration: 0.6, ease: 'easeOut' }}
                    className={cn(
                      'relative h-full rounded-full',
                      isOverBudget && 'bg-gradient-to-r from-expense to-expense/80',
                      isNearLimit && 'bg-gradient-to-r from-warning to-warning/80',
                      isHealthy && 'bg-gradient-to-r from-primary to-primary/80'
                    )}
                  >
                    {/* Shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 1, repeat: 0 }}
                    />
                  </motion.div>
                  
                  {/* Over budget indicator */}
                  {isOverBudget && (
                    <motion.div
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-expense border-2 border-card"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ delay: 0.5, duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                    />
                  )}
                </div>
                
                {/* Over budget warning */}
                {isOverBudget && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.06 }}
                    className="text-[10px] text-expense mt-1 flex items-center gap-1"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Over by {formatCurrency(budget.spent - Number(budget.amount))}
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
