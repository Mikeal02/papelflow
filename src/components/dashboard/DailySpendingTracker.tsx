import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

export function DailySpendingTracker() {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const { days, avgDaily, todaySpending, daysRemaining } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const allDays = eachDayOfInterval({ start, end });

    const dailyMap: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= start && d <= end;
      })
      .forEach(t => {
        const key = t.date;
        dailyMap[key] = (dailyMap[key] || 0) + Number(t.amount);
      });

    const days = allDays.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: d,
        label: format(d, 'd'),
        amount: dailyMap[key] || 0,
        isToday: isToday(d),
        isPast: isBefore(d, now) && !isToday(d),
      };
    });

    const pastDays = days.filter(d => d.isPast || d.isToday);
    const totalSpent = pastDays.reduce((s, d) => s + d.amount, 0);
    const todayData = days.find(d => d.isToday);

    return {
      days,
      avgDaily: pastDays.length > 0 ? totalSpent / pastDays.length : 0,
      todaySpending: todayData?.amount || 0,
      daysRemaining: allDays.length - pastDays.length,
    };
  }, [transactions]);

  const maxAmount = Math.max(...days.map(d => d.amount), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="stat-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-expense/20 to-expense/10">
            <Activity className="h-4 w-4 text-expense" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Daily Spending</h3>
            <p className="text-[10px] text-muted-foreground">{daysRemaining} days remaining this month</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="text-sm font-bold text-expense">{formatCurrency(todaySpending)}</p>
        </div>
      </div>

      {/* Mini heatmap */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.slice(0, 28).map((day, i) => {
          const intensity = day.amount > 0 ? Math.max(0.15, day.amount / maxAmount) : 0;
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-sm flex items-center justify-center text-[8px] font-medium transition-colors',
                day.isToday && 'ring-1 ring-primary',
                !day.isPast && !day.isToday && 'opacity-30'
              )}
              style={{
                backgroundColor: day.amount > 0
                  ? `hsl(var(--expense) / ${intensity})`
                  : 'hsl(var(--muted) / 0.3)',
              }}
              title={`${format(day.date, 'MMM d')}: ${formatCurrency(day.amount)}`}
            >
              {day.label}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] text-muted-foreground">Daily average</p>
          <p className="text-sm font-bold">{formatCurrency(avgDaily)}</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-expense/20" />
            <span className="text-muted-foreground">Low</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-expense/60" />
            <span className="text-muted-foreground">Med</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-expense" />
            <span className="text-muted-foreground">High</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
