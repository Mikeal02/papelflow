import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore,
  addMonths, subMonths, getDay, isSameMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const getHeatColor = (intensity: number, isDark: boolean) => {
  if (intensity === 0) return isDark ? 'hsl(222 25% 10% / 0.5)' : 'hsl(215 25% 96% / 0.5)';
  if (intensity < 0.2) return 'hsl(155 65% 48% / 0.2)';
  if (intensity < 0.4) return 'hsl(155 65% 48% / 0.45)';
  if (intensity < 0.6) return 'hsl(40 95% 50% / 0.45)';
  if (intensity < 0.8) return 'hsl(20 90% 50% / 0.55)';
  return 'hsl(0 78% 55% / 0.65)';
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
        date: d, key, dayNum: format(d, 'd'), amount,
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

    const weekdayTotals = Array(7).fill(0);
    days.forEach(d => { weekdayTotals[d.weekday] += d.amount; });

    return { days, maxSpend, totalSpend, avgSpend, topDay, weekdayTotals };
  }, [transactions, currentMonth]);

  const startPadding = getDay(startOfMonth(currentMonth));
  const maxWeekdayTotal = Math.max(...weekdayTotals, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-expense/20 to-warning/10">
              <Flame className="h-4 w-4 text-expense" />
            </div>
            <div>
              <span className="font-semibold">Spending Heatmap</span>
              <p className="text-[10px] text-muted-foreground font-normal">Daily intensity</p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-0.5 bg-muted/40 rounded-xl p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] font-semibold min-w-[64px] text-center tabular-nums">
              {format(currentMonth, 'MMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total', value: formatCurrency(totalSpend), className: 'text-expense' },
            { label: 'Daily Avg', value: formatCurrency(avgSpend), className: 'text-foreground' },
            { label: 'Peak', value: topDay ? format(topDay.date, 'MMM d') : '—', className: 'text-expense' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-xl bg-muted/20 border border-border/20">
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className={cn('text-xs font-bold tabular-nums', s.className)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="space-y-[3px]">
          <div className="grid grid-cols-7 gap-[3px]">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-[9px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-[3px]">
            {Array(startPadding).fill(null).map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
            {days.map((day, i) => {
              const intensity = day.amount > 0 ? day.amount / maxSpend : 0;
              const isHovered = hoveredDay === day.key;
              return (
                <div key={day.key} className="relative">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.006, duration: 0.15 }}
                    className={cn(
                      'aspect-square rounded-[4px] flex items-center justify-center cursor-pointer transition-all duration-150',
                      day.isToday && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      day.isFuture && 'opacity-30',
                      isHovered && 'ring-2 ring-foreground/30 scale-110 z-10',
                    )}
                    style={{ backgroundColor: getHeatColor(intensity, isDark) }}
                    onMouseEnter={() => setHoveredDay(day.key)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <span className={cn(
                      'text-[9px] font-medium leading-none',
                      intensity > 0.5 ? 'text-white' : 'text-foreground',
                      day.isToday && 'font-bold',
                    )}>
                      {day.dayNum}
                    </span>
                  </motion.div>

                  <AnimatePresence>
                    {isHovered && day.isPast && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.9 }}
                        className="absolute -top-[48px] left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-2 py-1 shadow-xl whitespace-nowrap pointer-events-none"
                      >
                        <p className="text-[9px] font-medium">{format(day.date, 'EEE, MMM d')}</p>
                        <p className={cn('text-[11px] font-bold tabular-nums', day.amount > 0 ? 'text-expense' : 'text-muted-foreground')}>
                          {day.amount > 0 ? formatCurrency(day.amount) : 'No spending'}
                        </p>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-1.5 h-1.5 bg-popover border-r border-b border-border" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[9px] text-muted-foreground font-medium">Less</span>
          {[0, 0.15, 0.35, 0.55, 0.75, 0.95].map((v, i) => (
            <div key={i} className="w-3 h-3 rounded-sm transition-transform hover:scale-125" style={{ backgroundColor: getHeatColor(v, isDark) }} />
          ))}
          <span className="text-[9px] text-muted-foreground font-medium">More</span>
        </div>

        {/* Weekday breakdown */}
        <div className="pt-3 border-t border-border/30 space-y-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">By Weekday</p>
          <div className="space-y-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name, i) => {
              const pct = maxWeekdayTotal > 0 ? (weekdayTotals[i] / maxWeekdayTotal) * 100 : 0;
              return (
                <div key={name} className="flex items-center gap-2 text-[10px]">
                  <span className="w-7 text-muted-foreground font-medium">{name}</span>
                  <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.3 + i * 0.04, duration: 0.4 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, hsl(var(--expense) / 0.35), hsl(var(--expense) / 0.75))` }}
                    />
                  </div>
                  <span className="w-12 text-right text-muted-foreground tabular-nums">{formatCurrency(weekdayTotals[i])}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
