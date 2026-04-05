import { motion } from 'framer-motion';
import { Activity, Sparkles } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useMonthlyStats } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

export const WelcomeHeader = memo(function WelcomeHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: stats } = useMonthlyStats();
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const { greeting, emoji, currentDate, savingsRate, streakLabel } = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 6 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 && hour < 21;

    const sr = stats && stats.income > 0
      ? Math.round(((stats.income - stats.expenses) / stats.income) * 100)
      : 0;

    return {
      greeting: isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : isEvening ? 'Good evening' : 'Good night',
      emoji: isMorning ? '☀️' : isAfternoon ? '🌤️' : isEvening ? '🌅' : '🌙',
      currentDate: format(new Date(), 'EEEE, MMMM d'),
      savingsRate: sr,
      streakLabel: sr >= 30 ? 'Excellent saver' : sr >= 20 ? 'Great progress' : sr >= 10 ? 'Building momentum' : sr > 0 ? 'Getting started' : null,
    };
  }, [stats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <span>{emoji}</span>
          <span>{currentDate}</span>
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
      </div>
      
      <div className="flex items-center gap-2.5 shrink-0">
        {stats && stats.income > 20 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={cn(
              "flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-full border",
              savingsRate >= 20 
                ? "bg-income/6 border-income/15 text-income" 
                : savingsRate >= 0 
                  ? "bg-warning/6 border-warning/15 text-warning"
                  : "bg-expense/6 border-expense/15 text-expense"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{savingsRate >= 0 ? '+' : ''}{savingsRate}% saved</span>
          </motion.div>
        )}
        {streakLabel && savingsRate >= 20 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-full bg-primary/6 border border-primary/15 text-primary"
          >
            <Sparkles className="h-3 w-3" />
            {streakLabel}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
