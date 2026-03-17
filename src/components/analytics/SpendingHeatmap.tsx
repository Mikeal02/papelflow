import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO, getDay } from 'date-fns';
import { cn } from '@/lib/utils';

export const SpendingHeatmap = () => {
  const { heatmapData } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();
  const [hoveredCell, setHoveredCell] = useState<{ weekIndex: number; dayIndex: number } | null>(null);

  const { weeks, maxValue, totalSpent, avgDaily, activeDays, highSpendDays, peakDay } = useMemo(() => {
    const max = Math.max(...heatmapData.map(d => d.value), 1);
    const total = heatmapData.reduce((s, d) => s + d.value, 0);
    const avg = heatmapData.length > 0 ? total / heatmapData.length : 0;
    const active = heatmapData.filter(d => d.value > 0).length;
    const high = heatmapData.filter(d => d.value > avg * 1.5).length;
    const peak = heatmapData.reduce((best, d) => d.value > best.value ? d : best, heatmapData[0]);

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

    return { weeks: weekGroups, maxValue: max, totalSpent: total, avgDaily: avg, activeDays: active, highSpendDays: high, peakDay: peak };
  }, [heatmapData]);

  const getIntensity = (value: number) => {
    if (value === 0) return 0;
    const n = value / maxValue;
    if (n < 0.15) return 1;
    if (n < 0.3) return 2;
    if (n < 0.5) return 3;
    if (n < 0.75) return 4;
    return 5;
  };

  const intensityStyles = [
    'bg-muted/20',
    'bg-primary/15 shadow-[inset_0_0_4px_hsl(var(--primary)/0.1)]',
    'bg-primary/30 shadow-[inset_0_0_6px_hsl(var(--primary)/0.15)]',
    'bg-primary/50 shadow-[inset_0_0_8px_hsl(var(--primary)/0.2)]',
    'bg-primary/70 shadow-[inset_0_0_10px_hsl(var(--primary)/0.25)]',
    'bg-primary shadow-[inset_0_0_12px_hsl(var(--primary)/0.3)]',
  ];

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="stat-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span>Spending Heatmap</span>
                <p className="text-[10px] text-muted-foreground font-normal">Last 90 days</p>
              </div>
            </CardTitle>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Daily avg</p>
              <p className="text-sm font-bold tabular-nums">{formatCurrency(avgDaily)}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Day labels */}
          <div className="flex gap-[3px]">
            <div className="w-7 flex-shrink-0" />
            {dayLabels.map((day, i) => (
              <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-[3px] relative">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-[3px]">
                <div className="w-7 flex-shrink-0 text-[9px] text-muted-foreground flex items-center justify-end pr-1.5 font-medium">
                  {weekIndex === 0 || weekIndex === Math.floor(weeks.length / 2) || weekIndex === weeks.length - 1
                    ? format(parseISO(week[0]?.day || ''), 'MMM')
                    : null}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const day = week.find(d => getDay(parseISO(d.day)) === dayIndex);
                  const intensity = day ? getIntensity(day.value) : 0;
                  const isHovered = hoveredCell?.weekIndex === weekIndex && hoveredCell?.dayIndex === dayIndex;
                  const isPeak = day && peakDay && day.day === peakDay.day && day.value > 0;

                  return (
                    <div key={dayIndex} className="flex-1 relative">
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.004, duration: 0.2 }}
                        className={cn(
                          'aspect-square rounded-[4px] cursor-pointer transition-all duration-150',
                          intensityStyles[intensity],
                          isHovered && 'ring-2 ring-primary/60 scale-125 z-10',
                          isPeak && 'ring-1 ring-warning/50'
                        )}
                        onMouseEnter={() => setHoveredCell({ weekIndex, dayIndex })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />

                      {/* Tooltip */}
                      <AnimatePresence>
                        {isHovered && day && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.9 }}
                            className="absolute -top-[52px] left-1/2 -translate-x-1/2 z-50 bg-popover border border-border rounded-lg px-2.5 py-1.5 shadow-xl whitespace-nowrap pointer-events-none"
                          >
                            <p className="text-[10px] font-medium text-foreground">{format(parseISO(day.day), 'MMM d, yyyy')}</p>
                            <p className="text-xs font-bold text-primary tabular-nums">{formatCurrency(day.value)}</p>
                            <p className="text-[9px] text-muted-foreground">{day.transactions} txns</p>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b border-border" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[9px] text-muted-foreground font-medium">Less</span>
            {intensityStyles.map((style, i) => (
              <div key={i} className={cn('h-3.5 w-3.5 rounded-[3px] transition-transform hover:scale-125', style)} />
            ))}
            <span className="text-[9px] text-muted-foreground font-medium">More</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-base font-bold tabular-nums">{formatCurrency(totalSpent)}</p>
              <p className="text-[9px] text-muted-foreground font-medium">Total (90d)</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-base font-bold tabular-nums">{activeDays}</p>
              <p className="text-[9px] text-muted-foreground font-medium">Active days</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-base font-bold tabular-nums text-warning flex items-center justify-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                {highSpendDays}
              </p>
              <p className="text-[9px] text-muted-foreground font-medium">High spend</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
