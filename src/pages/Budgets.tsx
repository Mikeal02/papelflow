import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { useState, useMemo, useEffect } from 'react';
import { AddBudgetModal } from '@/components/budgets/AddBudgetModal';

const Budgets = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: budgets = [], isLoading: budgetsLoading } = useBudgets();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { formatCurrency } = useCurrency();

  const currentMonth = format(currentDate, 'yyyy-MM');
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Calculate spending per category for the current month
  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && txDate >= monthStart && txDate <= monthEnd;
      })
      .forEach(t => {
        if (t.category_id) {
          spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
        }
      });
    return spending;
  }, [transactions, monthStart, monthEnd]);

  // Filter budgets for current month and enrich with category data
  const monthBudgets = useMemo(() => {
    return budgets
      .filter(b => b.month === currentMonth)
      .map(budget => {
        const category = categories.find(c => c.id === budget.category_id);
        const spent = categorySpending[budget.category_id] || 0;
        const percentage = (spent / Number(budget.amount)) * 100;
        const remaining = Number(budget.amount) - spent;
        return {
          ...budget,
          category,
          spent,
          percentage,
          remaining,
        };
      })
      .filter(b => b.category);
  }, [budgets, categories, categorySpending, currentMonth]);

  const needsBudgets = monthBudgets.filter(b => b.category?.category_group === 'Needs');
  const wantsBudgets = monthBudgets.filter(b => b.category?.category_group === 'Wants');

  const totalBudget = monthBudgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = monthBudgets.reduce((sum, b) => sum + b.spent, 0);
  const budgetProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Budget alerts - triggers toast and optional email when budgets exceed thresholds
  const { resetAlerts } = useBudgetAlerts(monthBudgets);

  // Reset alerts when month changes
  useEffect(() => {
    resetAlerts();
  }, [currentMonth]);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-expense';
    if (percentage >= 80) return 'bg-warning';
    return 'bg-primary';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100) return <AlertCircle className="h-4 w-4 text-expense" />;
    if (percentage >= 80) return <AlertCircle className="h-4 w-4 text-warning" />;
    return <CheckCircle2 className="h-4 w-4 text-primary" />;
  };

  const isLoading = budgetsLoading || categoriesLoading || transactionsLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground mt-1">Track your spending limits</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 font-medium">{format(currentDate, 'MMMM yyyy')}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            New Budget
          </Button>
        </div>
      </motion.div>

        <AddBudgetModal 
          open={showAddModal} 
          onOpenChange={setShowAddModal}
          month={currentMonth}
        />
        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Budget Progress</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">
                  {formatCurrency(totalSpent)}
                </span>
                <span className="text-muted-foreground">
                  of {formatCurrency(totalBudget)} budgeted
                </span>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {budgetProgress.toFixed(0)}% spent
                </span>
                <span className="font-medium text-primary">
                  {formatCurrency(totalBudget - totalSpent)} remaining
                </span>
              </div>
              <Progress value={Math.min(budgetProgress, 100)} className="h-3" />
            </div>
          </div>
        </motion.div>

        {monthBudgets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card flex flex-col items-center justify-center py-12"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No budgets for this month</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first budget to start tracking your spending limits and stay on top of your finances.
            </p>
            <Button className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Needs */}
            {needsBudgets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Needs</h2>
                  <span className="text-sm text-muted-foreground">Essential expenses</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {needsBudgets.map((budget, index) => (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + index * 0.05 }}
                      className="stat-card"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: `${budget.category?.color}20` }}
                          >
                            {budget.category?.icon === 'home' && '🏠'}
                            {budget.category?.icon === 'shopping-cart' && '🛒'}
                            {budget.category?.icon === 'car' && '🚗'}
                            {budget.category?.icon === 'zap' && '⚡'}
                            {budget.category?.icon === 'heart-pulse' && '💊'}
                          </div>
                          <div>
                            <h3 className="font-semibold">{budget.category?.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {budget.rollover ? 'Rollover enabled' : 'No rollover'}
                            </p>
                          </div>
                        </div>
                        {getStatusIcon(budget.percentage)}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatCurrency(budget.spent)} spent
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              budget.remaining < 0 ? 'text-expense' : 'text-foreground'
                            )}
                          >
                            {formatCurrency(Math.abs(budget.remaining))}{' '}
                            {budget.remaining < 0 ? 'over' : 'left'}
                          </span>
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                            transition={{ delay: 0.3 + index * 0.05, duration: 0.6 }}
                            className={cn('absolute inset-y-0 left-0 rounded-full', getStatusColor(budget.percentage))}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {formatCurrency(Number(budget.amount))} budgeted
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Wants */}
            {wantsBudgets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">Wants</h2>
                  <span className="text-sm text-muted-foreground">Discretionary spending</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {wantsBudgets.map((budget, index) => (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                      className="stat-card"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                            style={{ backgroundColor: `${budget.category?.color}20` }}
                          >
                            {budget.category?.icon === 'utensils' && '🍽️'}
                            {budget.category?.icon === 'film' && '🎬'}
                            {budget.category?.icon === 'shopping-bag' && '🛍️'}
                            {budget.category?.icon === 'repeat' && '📺'}
                            {budget.category?.icon === 'sparkles' && '✨'}
                          </div>
                          <div>
                            <h3 className="font-semibold">{budget.category?.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {budget.rollover ? 'Rollover enabled' : 'No rollover'}
                            </p>
                          </div>
                        </div>
                        {getStatusIcon(budget.percentage)}
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatCurrency(budget.spent)} spent
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              budget.remaining < 0 ? 'text-expense' : 'text-foreground'
                            )}
                          >
                            {formatCurrency(Math.abs(budget.remaining))}{' '}
                            {budget.remaining < 0 ? 'over' : 'left'}
                          </span>
                        </div>
                        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
                            transition={{ delay: 0.4 + index * 0.05, duration: 0.6 }}
                            className={cn('absolute inset-y-0 left-0 rounded-full', getStatusColor(budget.percentage))}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          {formatCurrency(Number(budget.amount))} budgeted
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Budgets;
