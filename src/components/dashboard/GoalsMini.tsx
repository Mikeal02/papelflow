import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export function GoalsMini() {
  const { data: goals = [] } = useGoals();
  const { formatCurrency } = useCurrency();

  const activeGoals = goals.slice(0, 3);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Goals</h3>
            <p className="text-[10px] text-muted-foreground">{overallProgress.toFixed(0)}% overall</p>
          </div>
        </div>
        <Link to="/goals">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1">
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {activeGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium mb-1">No goals yet</p>
          <p className="text-sm text-muted-foreground">Set savings goals to track progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal, index) => {
            const progress = Number(goal.target_amount) > 0
              ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100
              : 0;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.52 + index * 0.04 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{goal.icon === 'target' ? '🎯' : goal.icon === 'home' ? '🏠' : goal.icon === 'car' ? '🚗' : goal.icon === 'graduation-cap' ? '🎓' : goal.icon === 'plane' ? '✈️' : '💰'}</span>
                    <span className="font-medium truncate">{goal.name}</span>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{formatCurrency(Number(goal.current_amount || 0))}</span>
                  <span>{formatCurrency(Number(goal.target_amount))}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
