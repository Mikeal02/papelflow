import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronRight, Sparkles, Trophy, Flame, Clock } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProgressRing } from '@/components/ui/progress-ring';
import { TiltCard } from '@/components/ui/tilt-card';
import { GradientBadge } from '@/components/ui/glowing-border';
import { differenceInDays, parseISO } from 'date-fns';

export function GoalsMini() {
  const { data: goals = [] } = useGoals();
  const { formatCurrency } = useCurrency();

  const activeGoals = goals.slice(0, 3);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const completedGoals = goals.filter(g => Number(g.current_amount || 0) >= Number(g.target_amount)).length;

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
      laptop: '💻',
      ring: '💍',
      baby: '👶',
      briefcase: '💼',
    };
    return emojiMap[icon] || '💰';
  };

  const getDaysRemaining = (deadline: string | null) => {
    if (!deadline) return null;
    const days = differenceInDays(parseISO(deadline), new Date());
    return days > 0 ? days : 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.48 }}
    >
      <TiltCard intensity={8} className="stat-card h-full relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-income/[0.02] pointer-events-none" />
        
        {/* Floating particles for completed goals */}
        {completedGoals > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full bg-income/40"
                initial={{ 
                  x: Math.random() * 100 + '%', 
                  y: '100%',
                  opacity: 0 
                }}
                animate={{ 
                  y: '-20%',
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 1.5,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>
        )}
        
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              <ProgressRing progress={overallProgress} size={44} strokeWidth={4} color="primary" showGlow>
                <Target className="h-4 w-4 text-primary" />
              </ProgressRing>
              {completedGoals > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-income flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.5 }}
                >
                  <span className="text-[9px] font-bold text-white">{completedGoals}</span>
                </motion.div>
              )}
            </motion.div>
            <div>
              <h3 className="text-base font-semibold">Goals</h3>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">{overallProgress.toFixed(0)}% overall</p>
                {overallProgress >= 50 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-0.5"
                  >
                    <Flame className="h-2.5 w-2.5 text-warning" />
                  </motion.span>
                )}
              </div>
            </div>
          </div>
          <Link to="/goals">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-8 gap-1 group/btn">
              View all
              <motion.span whileHover={{ x: 3 }} className="inline-block">
                <ChevronRight className="h-3.5 w-3.5" />
              </motion.span>
            </Button>
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {activeGoals.length === 0 ? (
            <motion.div 
              key="empty"
              className="flex flex-col items-center justify-center py-10 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <motion.div 
                className="relative mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/25 blur-2xl" />
                <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center border border-border/50">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
              </motion.div>
              <p className="font-semibold mb-1">No goals yet</p>
              <p className="text-sm text-muted-foreground">Set savings goals to track progress</p>
            </motion.div>
          ) : (
            <motion.div 
              key="goals"
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {activeGoals.map((goal, index) => {
                const progress = Number(goal.target_amount) > 0
                  ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100
                  : 0;
                const isComplete = progress >= 100;
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isUrgent = daysRemaining !== null && daysRemaining <= 30 && !isComplete;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.52 + index * 0.08, type: 'spring', stiffness: 300 }}
                    whileHover={{ x: 4, scale: 1.01 }}
                    className={cn(
                      "relative p-3.5 rounded-xl border transition-all duration-300 overflow-hidden",
                      isComplete 
                        ? "bg-gradient-to-br from-income/10 to-income/5 border-income/30" 
                        : "bg-muted/30 border-border/40 hover:border-primary/40 hover:shadow-md"
                    )}
                  >
                    {/* Completion celebration effect */}
                    {isComplete && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-income/10 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                      />
                    )}
                    
                    <div className="relative flex items-center gap-3">
                      <motion.div
                        className={cn(
                          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                          isComplete 
                            ? "bg-gradient-to-br from-income/30 to-income/20" 
                            : "bg-gradient-to-br from-muted to-muted/80"
                        )}
                        whileHover={{ rotate: 5, scale: 1.05 }}
                        animate={isComplete ? { 
                          boxShadow: [
                            '0 0 0 0 hsl(var(--income) / 0)',
                            '0 0 20px 4px hsl(var(--income) / 0.3)',
                            '0 0 0 0 hsl(var(--income) / 0)'
                          ]
                        } : {}}
                        transition={{ duration: 2, repeat: isComplete ? Infinity : 0 }}
                      >
                        <span className="text-xl">
                          {isComplete ? '🎉' : getGoalEmoji(goal.icon || 'target')}
                        </span>
                      </motion.div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{goal.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUrgent && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium"
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {daysRemaining}d
                              </motion.span>
                            )}
                            {isComplete ? (
                              <GradientBadge variant="success">
                                <Trophy className="h-2.5 w-2.5" />
                                Done!
                              </GradientBadge>
                            ) : (
                              <span className="text-xs font-bold text-primary">{progress.toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Premium progress bar */}
                        <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden">
                          {/* Glow */}
                          <motion.div
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-full blur-sm opacity-60",
                              isComplete ? "bg-income" : "bg-primary"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
                          />
                          
                          {/* Main bar */}
                          <motion.div
                            className={cn(
                              "relative h-full rounded-full",
                              isComplete 
                                ? "bg-gradient-to-r from-income via-accent to-income" 
                                : "bg-gradient-to-r from-primary to-primary/80"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            transition={{ delay: 0.6 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
                          >
                            {/* Shine */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                              initial={{ x: '-100%' }}
                              animate={{ x: '200%' }}
                              transition={{ delay: 0.9 + index * 0.1, duration: 0.8, repeat: 0 }}
                            />
                          </motion.div>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
                          <span className="font-medium">{formatCurrency(Number(goal.current_amount || 0))}</span>
                          <span>{formatCurrency(Number(goal.target_amount))}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </TiltCard>
    </motion.div>
  );
}
