import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Flame, Target, Coins, Receipt } from 'lucide-react';
import { useTransactions, useMonthlyStats } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useBudgets } from '@/hooks/useBudgets';
import { useAccounts } from '@/hooks/useAccounts';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { startOfWeek, endOfWeek, format, isToday, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ui/progress-ring';
import { CountUpValue } from '@/components/ui/CountUpValue';

export const QuickStats = memo(function QuickStats() {
  const { data: transactions = [] } = useTransactions();
  const { data: stats } = useMonthlyStats();
  const { data: goals = [] } = useGoals();
  const { data: budgets = [] } = useBudgets();
  const { data: accounts = [] } = useAccounts();
  const { data: subscriptions = [] } = useSubscriptions();
  const { formatCurrency } = useCurrency();

  const quickStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const currentMonth = format(now, 'yyyy-MM');
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const weekSpending = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= weekStart && d <= weekEnd;
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    const savingsRate = stats?.income ? Math.round(((stats.income - stats.expenses) / stats.income) * 100) : 0;

    const last30Days = eachDayOfInterval({ start: subDays(now, 30), end: now });
    let streak = 0;
    for (let i = last30Days.length - 1; i >= 0; i--) {
      const dayStr = format(last30Days[i], 'yyyy-MM-dd');
      const hasTransaction = transactions.some(t => t.date?.startsWith(dayStr));
      if (hasTransaction || isToday(last30Days[i])) { streak++; } else { break; }
    }

    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((acc, t) => {
        if (t.category_id) acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const onTrackBudgets = budgets.filter(b => (monthExpenses[b.category_id] || 0) <= Number(b.amount)).length;
    const budgetHealth = budgets.length > 0 ? Math.round((onTrackBudgets / budgets.length) * 100) : 100;

    const monthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });

    const activeSubs = subscriptions.filter(s => s.is_active).length;
    const monthlySubs = subscriptions
      .filter(s => s.is_active)
      .reduce((sum, s) => {
        if (s.frequency === 'monthly') return sum + Number(s.amount);
        if (s.frequency === 'yearly') return sum + Number(s.amount) / 12;
        if (s.frequency === 'weekly') return sum + Number(s.amount) * 4;
        return sum;
      }, 0);

    return [
      { label: 'Week Spending', value: formatCurrency(weekSpending), icon: Coins, color: 'from-chart-5/20 to-chart-5/5', iconColor: 'text-chart-5' },
      { label: 'Savings Rate', value: `${savingsRate}%`, icon: TrendingUp, color: savingsRate >= 20 ? 'from-income/20 to-income/5' : 'from-warning/20 to-warning/5', iconColor: savingsRate >= 20 ? 'text-income' : 'text-warning', progress: savingsRate, progressColor: savingsRate >= 20 ? 'income' as const : 'warning' as const },
      { label: 'Active Streak', value: `${streak} days`, icon: Flame, color: streak >= 7 ? 'from-chart-4/20 to-chart-4/5' : 'from-muted/20 to-muted/5', iconColor: streak >= 7 ? 'text-chart-4' : 'text-muted-foreground', trend: streak >= 7 ? '🔥' : null },
      { label: 'Budget Health', value: `${budgetHealth}%`, icon: Target, color: budgetHealth >= 80 ? 'from-income/20 to-income/5' : 'from-warning/20 to-warning/5', iconColor: budgetHealth >= 80 ? 'text-income' : 'text-warning', progress: budgetHealth, progressColor: budgetHealth >= 80 ? 'income' as const : 'warning' as const },
      { label: 'Transactions', value: monthTx.length.toString(), icon: Receipt, color: 'from-primary/20 to-primary/5', iconColor: 'text-primary', sub: 'this month' },
      { label: 'Subscriptions', value: formatCurrency(monthlySubs), icon: Zap, color: 'from-accent/20 to-accent/5', iconColor: 'text-accent', sub: `${activeSubs} active` },
    ];
  }, [transactions, stats, goals, budgets, accounts, subscriptions, formatCurrency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3"
    >
      {quickStats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.05 }}
        >
          <div
            className={cn(
              'rounded-xl p-3 bg-gradient-to-br border border-border/30 h-full',
              'transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:border-border/50',
              stat.color
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={cn('h-4 w-4 shrink-0', stat.iconColor)} />
              {stat.progress !== undefined && (
                <ProgressRing progress={stat.progress} size={24} strokeWidth={3} color={stat.progressColor} showGlow={false} />
              )}
              {stat.trend && <span className="text-xs">{stat.trend}</span>}
            </div>
            <div className="min-w-0 overflow-hidden">
              <CountUpValue value={stat.value} className="text-base sm:text-lg font-bold block truncate" duration={1000} />
              <p className="text-[10px] text-muted-foreground truncate">{stat.sub || stat.label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
});
