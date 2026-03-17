import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo, useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

export function DailySpendingTracker() {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
        date: d, label: format(d, 'd'), amount: dailyMap[key] || 0,
        isToday: isToday(d), isPast: isBefore(d, now) && !isToday(d),
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
            <p className="text-[10px] text-muted-foreground">{daysRemaining} days remaining</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Today</p>
          <p className="text-sm font-bold text-expense tabular-nums">{formatCurrency(todaySpending)}</p>
        </div>
      </div>

      {/* Mini heatmap */}
      <div className="grid grid-cols-7 gap-[3px] mb-3">
        {days.slice(0, 28).map((day, i) => {
          const intensity = day.amount > 0 ? Math.max(0.15, day.amount / maxAmount) : 0;
          const isHovered = hoveredIdx === i;
          return (
            <div key={i} className="relative">
              <div
                className={cn(
                  'aspect-square rounded-[3px] flex items-center justify-center text-[8px] font-medium transition-all duration-150 cursor-pointer',
                  day.isToday && 'ring-1.5 ring-primary ring-offset-1 ring-offset-background',
                  !day.isPast && !day.isToday && 'opacity-25',
                  isHovered && 'scale-125 z-10 ring-1 ring-foreground/30',
                )}
                style={{
                  backgroundColor: day.amount > 0
                    ? `hsl(var(--expense) / ${intensity})`
                    : 'hsl(var(--muted) / 0.2)',
                }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {day.label}
              </div>

              <AnimatePresence>
                {isHovered && (day.isPast || day.isToday) && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    className="absolute -top-[40px] left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-md px-2 py-1 shadow-lg whitespace-nowrap pointer-events-none"
                  >
                    <p className="text-[9px] font-medium">{format(day.date, 'MMM d')}</p>
                    <p className="text-[10px] font-bold text-expense tabular-nums">{formatCurrency(day.amount)}</p>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-1.5 h-1.5 bg-popover border-r border-b border-border" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Daily avg</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(avgDaily)}</p>
        </div>
        <div className="flex gap-2 text-[9px]">
          {[
            { label: 'Low', opacity: '0.2' },
            { label: 'Med', opacity: '0.5' },
            { label: 'High', opacity: '1' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm" style={{ backgroundColor: `hsl(var(--expense) / ${l.opacity})` }} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
