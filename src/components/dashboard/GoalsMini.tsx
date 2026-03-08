import { motion } from 'framer-motion';
import { Target, ChevronRight, Sparkles } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { TiltCard } from '@/components/ui/tilt-card';
import { GradientBadge } from '@/components/ui/glowing-border';

export function GoalsMini() {
  const { data: goals = [] } = useGoals();
  const { formatCurrency } = useCurrency();

  const activeGoals = goals.slice(0, 3);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const getGoalEmoji = (icon: string) => {
    const emojiMap: Record<string, string> = {
      target: '🎯',
      home: '🏠',
      car: '🚗',
      'graduation-cap': '🎓',
      plane: '✈️',
      piggy: '🐷',
      gift: '🎁',
      heart: '❤️',
    };
    return emojiMap[icon] || '💰';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
    >
      <TiltCard className="stat-card h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ProgressRing progress={overallProgress} size={40} strokeWidth={4} color="primary" showGlow>
              <Target className="h-4 w-4 text-primary" />
            </ProgressRing>
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
            <motion.div 
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Target className="h-7 w-7 text-muted-foreground" />
            </motion.div>
            <p className="font-medium mb-1">No goals yet</p>
            <p className="text-sm text-muted-foreground">Set savings goals to track progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal, index) => {
              const progress = Number(goal.target_amount) > 0
                ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100
                : 0;
              const isComplete = progress >= 100;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.52 + index * 0.04 }}
                  className={cn(
                    "p-3 rounded-xl border transition-all",
                    isComplete 
                      ? "bg-income/5 border-income/20" 
                      : "bg-muted/30 border-border/30 hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="text-xl"
                      animate={isComplete ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 2 }}
                    >
                      {getGoalEmoji(goal.icon || 'target')}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{goal.name}</span>
                        {isComplete ? (
                          <GradientBadge variant="success">
                            <Sparkles className="h-2.5 w-2.5" />
                            Done!
                          </GradientBadge>
                        ) : (
                          <span className="text-xs font-bold text-primary shrink-0">{progress.toFixed(0)}%</span>
                        )}
                      </div>
                      <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={cn(
                            "h-full rounded-full",
                            isComplete ? "bg-gradient-to-r from-income to-accent" : "bg-primary"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{formatCurrency(Number(goal.current_amount || 0))}</span>
                        <span>{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </TiltCard>
    </motion.div>
  );
}
