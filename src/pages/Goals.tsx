import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Calendar, MoreHorizontal, TrendingUp, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGoals, useDeleteGoal, useUpdateGoal } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { AddGoalModal } from '@/components/goals/AddGoalModal';

const Goals = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: goals = [], isLoading } = useGoals();
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  const { formatCurrency } = useCurrency();

  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);

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
            <h1 className="text-3xl font-bold">Financial Goals</h1>
            <p className="text-muted-foreground mt-1">
              Track your savings progress
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4" />
            Create Goal
          </Button>
        </motion.div>

        <AddGoalModal open={showAddModal} onOpenChange={setShowAddModal} />

        {/* Summary */}
        {goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="stat-card"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Progress</p>
                <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold text-income truncate" title={formatCurrency(totalSaved)}>
                    {formatCurrency(totalSaved)}
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    of {formatCurrency(totalTarget)} goal
                  </span>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-muted-foreground">
                    {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}% complete
                  </span>
                  <span className="font-medium truncate ml-2" title={formatCurrency(totalTarget - totalSaved)}>
                    {formatCurrency(totalTarget - totalSaved)} remaining
                  </span>
                </div>
                <Progress value={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0} className="h-2 sm:h-3" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Goals Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal, index) => {
            const percentage = Number(goal.target_amount) > 0 
              ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100 
              : 0;
            const remaining = Number(goal.target_amount) - Number(goal.current_amount || 0);
            const daysRemaining = goal.deadline
              ? differenceInDays(new Date(goal.deadline), new Date())
              : null;
            const monthlyNeeded =
              daysRemaining && daysRemaining > 0
                ? remaining / (daysRemaining / 30)
                : null;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="stat-card group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: `${goal.color || '#10B981'}20` }}
                  >
                    {goal.icon === 'shield' && '🛡️'}
                    {goal.icon === 'plane' && '✈️'}
                    {goal.icon === 'car' && '🚗'}
                    {goal.icon === 'home' && '🏠'}
                    {goal.icon === 'target' && '🎯'}
                    {!goal.icon && '🎯'}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const addAmount = prompt('How much to add?');
                          if (addAmount) {
                            updateGoal.mutate({
                              id: goal.id,
                              current_amount: Number(goal.current_amount || 0) + Number(addAmount),
                            });
                          }
                        }}
                      >
                        Add funds
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const withdrawAmount = prompt('How much to withdraw?');
                          if (withdrawAmount) {
                            updateGoal.mutate({
                              id: goal.id,
                              current_amount: Math.max(0, Number(goal.current_amount || 0) - Number(withdrawAmount)),
                            });
                          }
                        }}
                      >
                        Withdraw
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteGoal.mutate(goal.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-lg sm:text-xl font-semibold mb-1 truncate" title={goal.name}>{goal.name}</h3>
                {goal.deadline && (
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mb-4 flex-wrap">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Target: {format(new Date(goal.deadline), 'MMM yyyy')}</span>
                    {daysRemaining && daysRemaining > 0 && (
                      <span className="text-xs">• {daysRemaining} days left</span>
                    )}
                  </p>
                )}

                <div className="space-y-2 sm:space-y-3 mt-auto">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-2 sm:h-3 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: goal.color || '#10B981' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-income truncate" title={formatCurrency(Number(goal.current_amount || 0))}>
                      {formatCurrency(Number(goal.current_amount || 0))}
                    </span>
                    <span className="text-muted-foreground truncate ml-2" title={formatCurrency(Number(goal.target_amount))}>
                      {formatCurrency(Number(goal.target_amount))}
                    </span>
                  </div>
                </div>

                {monthlyNeeded && monthlyNeeded > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">
                        Save{' '}
                        <span className="font-semibold text-foreground">
                          {formatCurrency(monthlyNeeded)}/mo
                        </span>{' '}
                        to reach goal
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  variant="secondary"
                  style={{ borderColor: goal.color || '#10B981' }}
                  onClick={() => {
                    const addAmount = prompt('How much to add?');
                    if (addAmount) {
                      updateGoal.mutate({
                        id: goal.id,
                        current_amount: Number(goal.current_amount || 0) + Number(addAmount),
                      });
                    }
                  }}
                >
                  Add Funds
                </Button>
              </motion.div>
            );
          })}

          {/* Add New Goal Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="stat-card border-dashed flex flex-col items-center justify-center min-h-[300px] cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">Create New Goal</h3>
            <p className="text-sm text-muted-foreground text-center">
              Set a target and start saving
            </p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Goals;
