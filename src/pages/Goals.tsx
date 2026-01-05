import { motion } from 'framer-motion';
import { Plus, Target, Calendar, MoreHorizontal, TrendingUp } from 'lucide-react';
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
import { mockGoals } from '@/lib/mock-data';

const Goals = () => {
  const totalTarget = mockGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = mockGoals.reduce((sum, g) => sum + g.currentAmount, 0);

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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Goal
          </Button>
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
              <p className="text-sm text-muted-foreground">Total Progress</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-income">
                  ${totalSaved.toLocaleString()}
                </span>
                <span className="text-muted-foreground">
                  of ${totalTarget.toLocaleString()} goal
                </span>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {((totalSaved / totalTarget) * 100).toFixed(0)}% complete
                </span>
                <span className="font-medium">
                  ${(totalTarget - totalSaved).toLocaleString()} remaining
                </span>
              </div>
              <Progress value={(totalSaved / totalTarget) * 100} className="h-3" />
            </div>
          </div>
        </motion.div>

        {/* Goals Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {mockGoals.map((goal, index) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;
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
                    style={{ backgroundColor: `${goal.color}20` }}
                  >
                    {goal.name === 'Emergency Fund' && '🛡️'}
                    {goal.name === 'Vacation' && '✈️'}
                    {goal.name === 'New Car' && '🚗'}
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
                      <DropdownMenuItem>Edit goal</DropdownMenuItem>
                      <DropdownMenuItem>Add funds</DropdownMenuItem>
                      <DropdownMenuItem>Withdraw</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="text-xl font-semibold mb-1">{goal.name}</h3>
                {goal.deadline && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                    <Calendar className="h-4 w-4" />
                    Target: {format(new Date(goal.deadline), 'MMM yyyy')}
                    {daysRemaining && daysRemaining > 0 && (
                      <span className="text-xs">• {daysRemaining} days left</span>
                    )}
                  </p>
                )}

                <div className="space-y-3 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-income">
                      ${goal.currentAmount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      ${goal.targetAmount.toLocaleString()}
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
                          ${monthlyNeeded.toFixed(0)}/mo
                        </span>{' '}
                        to reach goal
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full mt-4"
                  variant="secondary"
                  style={{ borderColor: goal.color }}
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
