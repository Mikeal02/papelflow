import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Target, Calendar, MoreHorizontal, TrendingUp, Loader2, Sparkles } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading goals...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Financial Goals</h1>
            <p className="text-muted-foreground mt-1 text-sm">Track your savings progress</p>
          </div>
          <Button className="gap-2 btn-premium" onClick={() => setShowAddModal(true)}>
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
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Progress</p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-income">{formatCurrency(totalSaved)}</span>
                  <span className="text-sm text-muted-foreground">of {formatCurrency(totalTarget)} goal</span>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">
                    {totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(0) : 0}% complete
                  </span>
                  <span className="font-bold">{formatCurrency(totalTarget - totalSaved)} remaining</span>
                </div>
                <div className="relative h-3 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}%` }}
                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-income to-accent"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Goals Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
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
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: 0.15 + index * 0.08 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="stat-card group cursor-default flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                      style={{ backgroundColor: `${goal.color || '#10B981'}15` }}
                    >
                      {goal.icon === 'shield' && '🛡️'}
                      {goal.icon === 'plane' && '✈️'}
                      {goal.icon === 'car' && '🚗'}
                      {goal.icon === 'home' && '🏠'}
                      {goal.icon === 'target' && '🎯'}
                      {!goal.icon && '🎯'}
                    </motion.div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
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
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteGoal.mutate(goal.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-lg font-bold mb-1 truncate">{goal.name}</h3>
                  {goal.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Target: {format(new Date(goal.deadline), 'MMM yyyy')}</span>
                      {daysRemaining && daysRemaining > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-muted/50 rounded-md text-[10px] font-medium">
                          {daysRemaining}d left
                        </span>
                      )}
                    </p>
                  )}

                  <div className="space-y-3 mt-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-bold">{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ delay: 0.2 + index * 0.08, duration: 0.8, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ 
                          background: `linear-gradient(90deg, ${goal.color || '#10B981'}, ${goal.color || '#10B981'}dd)` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-income">{formatCurrency(Number(goal.current_amount || 0))}</span>
                      <span className="text-muted-foreground">{formatCurrency(Number(goal.target_amount))}</span>
                    </div>
                  </div>

                  {monthlyNeeded && monthlyNeeded > 0 && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="mt-4 pt-4 border-t border-border/50"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-muted-foreground">
                          Save <span className="font-bold text-foreground">{formatCurrency(monthlyNeeded)}/mo</span>
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    className="w-full mt-4"
                    variant="secondary"
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
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funds
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add New Goal Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="stat-card border-dashed border-2 flex flex-col items-center justify-center min-h-[280px] cursor-pointer hover:border-primary/50 transition-all"
            onClick={() => setShowAddModal(true)}
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <h3 className="font-bold mb-1">Create New Goal</h3>
            <p className="text-sm text-muted-foreground text-center">Set a target and start saving</p>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Goals;
