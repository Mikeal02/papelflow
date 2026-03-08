import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isToday,
  isBefore,
  addMonths,
  subMonths,
  getDay,
  isSameMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Color scale from cool to hot
const getHeatColor = (intensity: number, isDark: boolean) => {
  if (intensity === 0) return isDark ? 'hsl(222, 25%, 10%)' : 'hsl(215, 25%, 96%)';
  if (intensity < 0.2) return 'hsl(155, 65%, 48% / 0.25)';
  if (intensity < 0.4) return 'hsl(155, 65%, 48% / 0.5)';
  if (intensity < 0.6) return 'hsl(40, 95%, 50% / 0.5)';
  if (intensity < 0.8) return 'hsl(20, 90%, 50% / 0.6)';
  return 'hsl(0, 78%, 55% / 0.7)';
};

export function SpendingHeatmapCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const isDark = document.documentElement.classList.contains('dark');

  const { days, maxSpend, totalSpend, avgSpend, topDay, weekdayTotals } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const allDays = eachDayOfInterval({ start, end });
    const now = new Date();

    // Build daily spending map
    const dailyMap: Record<string, number> = {};
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && isSameMonth(d, currentMonth);
      })
      .forEach(t => {
        const key = t.date?.slice(0, 10);
        if (key) dailyMap[key] = (dailyMap[key] || 0) + Number(t.amount);
      });

    const days = allDays.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      const amount = dailyMap[key] || 0;
      return {
        date: d,
        key,
        dayNum: format(d, 'd'),
        amount,
        isToday: isToday(d),
        isPast: isBefore(d, now) || isToday(d),
        isFuture: !isBefore(d, now) && !isToday(d),
        weekday: getDay(d),
      };
    });

    const pastDays = days.filter(d => d.isPast && d.amount > 0);
    const maxSpend = Math.max(...days.map(d => d.amount), 1);
    const totalSpend = days.reduce((s, d) => s + d.amount, 0);
    const avgSpend = pastDays.length > 0 ? totalSpend / pastDays.length : 0;
    const topDay = days.reduce((top, d) => (d.amount > top.amount ? d : top), days[0]);

    // Weekday breakdown
    const weekdayTotals = Array(7).fill(0);
    days.forEach(d => {
      weekdayTotals[d.weekday] += d.amount;
    });

    return { days, maxSpend, totalSpend, avgSpend, topDay, weekdayTotals };
  }, [transactions, currentMonth]);

  const startPadding = getDay(startOfMonth(currentMonth));
  const maxWeekdayTotal = Math.max(...weekdayTotals, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-expense/20 to-warning/10">
              <Flame className="h-4 w-4 text-expense" />
            </div>
            <div>
              <span className="font-semibold">Spending Heatmap</span>
              <p className="text-[10px] text-muted-foreground font-normal">Daily intensity this month</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium min-w-[70px] text-center">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-xs font-bold text-expense">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Daily Avg</p>
            <p className="text-xs font-bold">{formatCurrency(avgSpend)}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <p className="text-[10px] text-muted-foreground">Peak Day</p>
            <p className="text-xs font-bold text-expense">{topDay ? format(topDay.date, 'MMM d') : '—'}</p>
          </div>
        </div>

        {/* Calendar Heatmap Grid */}
        <div className="space-y-1">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding cells */}
            {Array(startPadding)
              .fill(null)
              .map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

            {/* Actual days */}
            {days.map((day, i) => {
              const intensity = day.amount > 0 ? day.amount / maxSpend : 0;
              const isHovered = hoveredDay === day.key;
              return (
                <motion.div
                  key={day.key}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.008, duration: 0.2 }}
                  className={cn(
                    'aspect-square rounded-md flex flex-col items-center justify-center relative cursor-pointer group',
                    day.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                    day.isFuture && 'opacity-40',
                  )}
                  style={{
                    backgroundColor: getHeatColor(intensity, isDark),
                  }}
                  onMouseEnter={() => setHoveredDay(day.key)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <span
                    className={cn(
                      'text-[10px] font-medium leading-none',
                      intensity > 0.5 ? 'text-white' : 'text-foreground',
                      day.isToday && 'font-bold'
                    )}
                  >
                    {day.dayNum}
                  </span>

                  {/* Tooltip */}
                  <AnimatePresence>
                    {isHovered && day.isPast && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none"
                      >
                        <p className="text-[10px] font-medium">{format(day.date, 'EEEE, MMM d')}</p>
                        <p className={cn('text-xs font-bold', day.amount > 0 ? 'text-expense' : 'text-muted-foreground')}>
                          {day.amount > 0 ? formatCurrency(day.amount) : 'No spending'}
                        </p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b border-border" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Color legend */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Less</span>
          <div className="flex gap-1">
            {[0, 0.15, 0.35, 0.55, 0.75, 0.95].map((v, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getHeatColor(v, isDark) }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>

        {/* Weekday breakdown mini-bars */}
        <div className="pt-3 border-t border-border/30 space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">By Day of Week</p>
          <div className="space-y-1">
            {WEEKDAYS.map((name, i) => {
              const pct = maxWeekdayTotal > 0 ? (weekdayTotals[i] / maxWeekdayTotal) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-2 text-[10px]">
                  <span className="w-7 text-muted-foreground font-medium">{name}</span>
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, hsl(var(--expense) / 0.4), hsl(var(--expense) / 0.8))`,
                      }}
                    />
                  </div>
                  <span className="w-14 text-right text-muted-foreground tabular-nums">
                    {formatCurrency(weekdayTotals[i])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
