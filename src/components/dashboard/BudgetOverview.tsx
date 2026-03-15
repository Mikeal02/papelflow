import { memo, useMemo } from 'react';
import { useBudgets } from '@/hooks/useBudgets';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { PieChart, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

export const BudgetOverview = memo(function BudgetOverview() {
  const { data: budgets = [], isLoading } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const { budgetsWithSpent, totalBudget, totalSpent, overallPercentage } = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const categorySpending = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth) && t.category_id)
      .reduce((acc, t) => {
        acc[t.category_id!] = (acc[t.category_id!] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const items = budgets
      .map((budget) => ({
        ...budget,
        spent: categorySpending[budget.category_id] || 0,
        percentage: Math.min(((categorySpending[budget.category_id] || 0) / Number(budget.amount)) * 100, 100),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    const tb = items.reduce((s, b) => s + Number(b.amount), 0);
    const ts = items.reduce((s, b) => s + b.spent, 0);

    return { budgetsWithSpent: items, totalBudget: tb, totalSpent: ts, overallPercentage: tb > 0 ? (ts / tb) * 100 : 0 };
  }, [budgets, transactions]);

  if (isLoading) {
    return (
      <div className="stat-card flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card relative overflow-hidden">
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
          <div className={cn(
            "text-right px-3 py-1.5 rounded-lg",
            overallPercentage >= 90 ? "bg-expense/10" : overallPercentage >= 70 ? "bg-warning/10" : "bg-income/10"
          )}>
            <p className={cn(
              "text-lg font-bold",
              overallPercentage >= 90 ? "text-expense" : overallPercentage >= 70 ? "text-warning" : "text-income"
            )}>
              {overallPercentage.toFixed(0)}%
            </p>
            <p className="text-[9px] text-muted-foreground">Overall</p>
          </div>
        )}
      </div>

      {budgetsWithSpent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="relative mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
              <PieChart className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <p className="text-sm font-medium mb-1">No budgets set up yet</p>
          <p className="text-xs text-muted-foreground">Create budgets to track spending</p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetsWithSpent.map((budget) => {
            const isOverBudget = budget.spent > Number(budget.amount);
            const isNearLimit = budget.percentage >= 80 && !isOverBudget;
            const isHealthy = budget.percentage < 80;

            return (
              <div key={budget.id} className="group hover:translate-x-1 transition-transform duration-200">
                <div className="flex items-center justify-between gap-2 text-sm mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn(
                      "h-6 w-6 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isOverBudget && "bg-expense/20",
                      isNearLimit && "bg-warning/20",
                      isHealthy && "bg-income/20"
                    )}>
                      {isOverBudget ? <AlertTriangle className="h-3 w-3 text-expense" /> :
                       isNearLimit ? <TrendingUp className="h-3 w-3 text-warning" /> :
                       <CheckCircle2 className="h-3 w-3 text-income" />}
                    </div>
                    <span className="font-medium truncate">{(budget.category as any)?.name || 'Category'}</span>
                  </div>
                  <span className={cn(
                    'font-semibold text-xs truncate max-w-[100px] sm:max-w-[140px] tabular-nums',
                    isOverBudget && 'text-expense',
                    isNearLimit && 'text-warning',
                    isHealthy && 'text-muted-foreground'
                  )}>
                    {formatCurrency(budget.spent)} / {formatCurrency(Number(budget.amount))}
                  </span>
                </div>
                
                <div className="relative h-2 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700 ease-out',
                      isOverBudget && 'bg-gradient-to-r from-expense to-expense/80',
                      isNearLimit && 'bg-gradient-to-r from-warning to-warning/80',
                      isHealthy && 'bg-gradient-to-r from-primary to-primary/80'
                    )}
                    style={{ width: `${budget.percentage}%` }}
                  />
                </div>
                
                {isOverBudget && (
                  <p className="text-[10px] text-expense mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Over by {formatCurrency(budget.spent - Number(budget.amount))}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
