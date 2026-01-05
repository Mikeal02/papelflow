import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockBudgets, mockCategories, getMonthlyStats } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

const Budgets = () => {
  const stats = getMonthlyStats();

  const budgetsWithCategories = mockBudgets.map((budget) => ({
    ...budget,
    category: mockCategories.find((c) => c.id === budget.categoryId)!,
    percentage: (budget.spent / budget.amount) * 100,
    remaining: budget.amount - budget.spent,
  }));

  const needsBudgets = budgetsWithCategories.filter(
    (b) => b.category.group === 'Needs'
  );
  const wantsBudgets = budgetsWithCategories.filter(
    (b) => b.category.group === 'Wants'
  );

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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 font-medium">January 2026</span>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Budget
            </Button>
          </div>
        </motion.div>

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
                  ${stats.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground">
                  of ${stats.totalBudget.toLocaleString()} budgeted
                </span>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {stats.budgetProgress.toFixed(0)}% spent
                </span>
                <span className="font-medium text-primary">
                  ${(stats.totalBudget - stats.totalSpent).toLocaleString()} remaining
                </span>
              </div>
              <Progress value={stats.budgetProgress} className="h-3" />
            </div>
          </div>
        </motion.div>

        {/* Needs */}
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
                      style={{ backgroundColor: `${budget.category.color}20` }}
                    >
                      {budget.category.name === 'Housing' && '🏠'}
                      {budget.category.name === 'Groceries' && '🛒'}
                      {budget.category.name === 'Transportation' && '🚗'}
                      {budget.category.name === 'Utilities' && '⚡'}
                      {budget.category.name === 'Health' && '💊'}
                    </div>
                    <div>
                      <h3 className="font-semibold">{budget.category.name}</h3>
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
                      ${budget.spent.toFixed(0)} spent
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        budget.remaining < 0 ? 'text-expense' : 'text-foreground'
                      )}
                    >
                      ${Math.abs(budget.remaining).toFixed(0)}{' '}
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
                    ${budget.amount} budgeted
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Wants */}
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
                      style={{ backgroundColor: `${budget.category.color}20` }}
                    >
                      {budget.category.name === 'Dining Out' && '🍽️'}
                      {budget.category.name === 'Entertainment' && '🎬'}
                      {budget.category.name === 'Shopping' && '🛍️'}
                      {budget.category.name === 'Subscriptions' && '📺'}
                      {budget.category.name === 'Personal Care' && '✨'}
                    </div>
                    <div>
                      <h3 className="font-semibold">{budget.category.name}</h3>
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
                      ${budget.spent.toFixed(0)} spent
                    </span>
                    <span
                      className={cn(
                        'font-medium',
                        budget.remaining < 0 ? 'text-expense' : 'text-foreground'
                      )}
                    >
                      ${Math.abs(budget.remaining).toFixed(0)}{' '}
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
                    ${budget.amount} budgeted
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Budgets;
