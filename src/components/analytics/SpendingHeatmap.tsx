import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO, getDay } from 'date-fns';
import { cn } from '@/lib/utils';

export const SpendingHeatmap = () => {
  const { heatmapData } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();
  const [hoveredCell, setHoveredCell] = useState<{ weekIndex: number; dayIndex: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { weeks, maxValue, totalSpent, avgDaily, activeDays, highSpendDays, peakDay, streakDays, weekdayAvg, weekendAvg } = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return { weeks: [], maxValue: 1, totalSpent: 0, avgDaily: 0, activeDays: 0, highSpendDays: 0, peakDay: null, streakDays: 0, weekdayAvg: 0, weekendAvg: 0 };
    }

    const max = Math.max(...heatmapData.map(d => d.value), 1);
    const total = heatmapData.reduce((s, d) => s + d.value, 0);
    const avg = heatmapData.length > 0 ? total / heatmapData.length : 0;
    const active = heatmapData.filter(d => d.value > 0).length;
    const high = heatmapData.filter(d => d.value > avg * 1.5).length;
    const peak = heatmapData.reduce((best, d) => d.value > best.value ? d : best, heatmapData[0]);

    // Calculate spending streak (consecutive days with spending)
    let streak = 0;
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].value > 0) streak++;
      else break;
    }

    // Weekday vs weekend averages
    const weekdays = heatmapData.filter(d => { const dow = getDay(parseISO(d.day)); return dow >= 1 && dow <= 5; });
    const weekends = heatmapData.filter(d => { const dow = getDay(parseISO(d.day)); return dow === 0 || dow === 6; });
    const wdAvg = weekdays.length > 0 ? weekdays.reduce((s, d) => s + d.value, 0) / weekdays.length : 0;
    const weAvg = weekends.length > 0 ? weekends.reduce((s, d) => s + d.value, 0) / weekends.length : 0;

    const weekGroups: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];

    heatmapData.forEach((day) => {
      const dayOfWeek = getDay(parseISO(day.day));
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) weekGroups.push(currentWeek);

    return { weeks: weekGroups, maxValue: max, totalSpent: total, avgDaily: avg, activeDays: active, highSpendDays: high, peakDay: peak, streakDays: streak, weekdayAvg: wdAvg, weekendAvg: weAvg };
  }, [heatmapData]);

  const getIntensity = (value: number) => {
    if (value === 0) return 0;
    const n = value / maxValue;
    if (n < 0.12) return 1;
    if (n < 0.25) return 2;
    if (n < 0.45) return 3;
    if (n < 0.7) return 4;
    return 5;
  };

  const intensityClasses = [
    'bg-muted/30 dark:bg-muted/10',
    'bg-primary/10 ring-1 ring-inset ring-primary/5',
    'bg-primary/25 ring-1 ring-inset ring-primary/10',
    'bg-primary/45 ring-1 ring-inset ring-primary/15',
    'bg-primary/65 ring-1 ring-inset ring-primary/20',
    'bg-primary/90 ring-1 ring-inset ring-primary/30 shadow-sm shadow-primary/20',
  ];

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const selectedDayData = selectedDay ? heatmapData.find(d => d.day === selectedDay) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="stat-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 ring-1 ring-primary/10">
                  <Calendar className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-income ring-2 ring-card" />
              </div>
              <div>
                <span className="text-sm font-bold">Spending Heatmap</span>
                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">90-day spending intensity</p>
              </div>
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-medium">Daily avg</p>
              <p className="text-base font-bold tabular-nums text-primary">{formatCurrency(avgDaily)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Weekday vs Weekend insight bar */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20 border border-border/10">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weekdays</span>
                <span className="text-xs font-bold tabular-nums">{formatCurrency(weekdayAvg)}/d</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weekdayAvg / Math.max(weekdayAvg, weekendAvg, 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              </div>
            </div>
            <div className="h-8 w-px bg-border/30" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weekends</span>
                <span className="text-xs font-bold tabular-nums">{formatCurrency(weekendAvg)}/d</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent/70"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weekendAvg / Math.max(weekdayAvg, weekendAvg, 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Day labels */}
          <div className="flex gap-[3px]">
            <div className="w-7 flex-shrink-0" />
            {dayLabels.map((day, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground/70 font-bold uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-[3px] relative">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-[3px]">
                <div className="w-7 flex-shrink-0 text-[9px] text-muted-foreground/50 flex items-center justify-end pr-1.5 font-semibold">
                  {weekIndex === 0 || weekIndex === Math.floor(weeks.length / 2) || weekIndex === weeks.length - 1
                    ? format(parseISO(week[0]?.day || ''), 'MMM')
                    : null}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const day = week.find(d => getDay(parseISO(d.day)) === dayIndex);
                  const intensity = day ? getIntensity(day.value) : 0;
                  const isHovered = hoveredCell?.weekIndex === weekIndex && hoveredCell?.dayIndex === dayIndex;
                  const isPeak = day && peakDay && day.day === peakDay.day && day.value > 0;
                  const isSelected = day && selectedDay === day.day;

                  return (
                    <div key={dayIndex} className="flex-1 relative">
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.003, duration: 0.2 }}
                        className={cn(
                          'aspect-square rounded-[5px] cursor-pointer transition-all duration-150',
                          intensityClasses[intensity],
                          isHovered && 'ring-2 ring-primary/60 scale-[1.3] z-10',
                          isSelected && 'ring-2 ring-accent scale-[1.2] z-10',
                          isPeak && !isHovered && 'ring-1 ring-warning/40',
                        )}
                        onMouseEnter={() => setHoveredCell({ weekIndex, dayIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => day && setSelectedDay(day.day === selectedDay ? null : day.day)}
                      />

                      {/* Tooltip */}
                      <AnimatePresence>
                        {isHovered && day && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.9 }}
                            className="absolute -top-[58px] left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap pointer-events-none"
                          >
                            <p className="text-[10px] font-semibold text-foreground">{format(parseISO(day.day), 'EEE, MMM d')}</p>
                            <p className="text-sm font-bold text-primary tabular-nums mt-0.5">{formatCurrency(day.value)}</p>
                            <p className="text-[9px] text-muted-foreground">{day.transactions} transaction{day.transactions !== 1 ? 's' : ''}</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-popover border-r border-b border-border" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected day detail */}
          <AnimatePresence>
            {selectedDayData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold">{format(parseISO(selectedDayData.day), 'EEEE, MMMM d, yyyy')}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{selectedDayData.transactions} transaction{selectedDayData.transactions !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary tabular-nums">{formatCurrency(selectedDayData.value)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedDayData.value > avgDaily ? `${((selectedDayData.value / avgDaily - 1) * 100).toFixed(0)}% above avg` : `${((1 - selectedDayData.value / avgDaily) * 100).toFixed(0)}% below avg`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground/60 font-semibold">Less</span>
              {intensityClasses.map((style, i) => (
                <div key={i} className={cn('h-3 w-3 rounded-[3px]', style)} />
              ))}
              <span className="text-[9px] text-muted-foreground/60 font-semibold">More</span>
            </div>
            {peakDay && (
              <p className="text-[9px] text-muted-foreground">
                Peak: <span className="font-semibold text-foreground">{format(parseISO(peakDay.day), 'MMM d')}</span>
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-border/20">
            {[
              { label: 'Total', value: formatCurrency(totalSpent), icon: BarChart3, color: 'text-primary' },
              { label: 'Active', value: `${activeDays}d`, icon: Zap, color: 'text-income' },
              { label: 'High spend', value: String(highSpendDays), icon: Flame, color: 'text-warning' },
              { label: 'Streak', value: `${streakDays}d`, icon: TrendingUp, color: 'text-accent' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="text-center p-2 rounded-xl bg-muted/15 border border-border/5 hover:bg-muted/30 transition-colors"
              >
                <stat.icon className={cn('h-3.5 w-3.5 mx-auto mb-1', stat.color)} />
                <p className="text-sm font-bold tabular-nums leading-none">{stat.value}</p>
                <p className="text-[8px] text-muted-foreground font-medium mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
