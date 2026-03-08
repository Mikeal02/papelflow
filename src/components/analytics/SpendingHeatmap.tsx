import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO, getDay } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const SpendingHeatmap = () => {
  const { heatmapData } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  const { weeks, maxValue, totalSpent, avgDaily } = useMemo(() => {
    const max = Math.max(...heatmapData.map(d => d.value), 1);
    const total = heatmapData.reduce((s, d) => s + d.value, 0);
    const avg = heatmapData.length > 0 ? total / heatmapData.length : 0;

    // Group by weeks
    const weekGroups: typeof heatmapData[] = [];
    let currentWeek: typeof heatmapData = [];

    heatmapData.forEach((day, i) => {
      const dayOfWeek = getDay(parseISO(day.day));
      
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weekGroups.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    
    if (currentWeek.length > 0) {
      weekGroups.push(currentWeek);
    }

    return { weeks: weekGroups, maxValue: max, totalSpent: total, avgDaily: avg };
  }, [heatmapData]);

  const getIntensity = (value: number) => {
    if (value === 0) return 0;
    const normalized = value / maxValue;
    if (normalized < 0.2) return 1;
    if (normalized < 0.4) return 2;
    if (normalized < 0.6) return 3;
    if (normalized < 0.8) return 4;
    return 5;
  };

  const intensityColors = [
    'bg-muted/30',
    'bg-primary/20',
    'bg-primary/40',
    'bg-primary/60',
    'bg-primary/80',
    'bg-primary',
  ];

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Spending Heatmap
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Avg: <span className="font-bold text-foreground">{formatCurrency(avgDaily)}</span>/day</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Day labels */}
          <div className="flex gap-1 mb-1">
            <div className="w-6" /> {/* Spacer for week labels */}
            {dayLabels.map((day, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex gap-1">
                <div className="w-6 text-[9px] text-muted-foreground flex items-center justify-end pr-1">
                  {weekIndex === 0 || weekIndex === Math.floor(weeks.length / 2) || weekIndex === weeks.length - 1 ? (
                    format(parseISO(week[0]?.day || ''), 'MMM')
                  ) : null}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const day = week.find(d => getDay(parseISO(d.day)) === dayIndex);
                  const intensity = day ? getIntensity(day.value) : 0;

                  return (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: (weekIndex * 7 + dayIndex) * 0.005 }}
                          className={cn(
                            'flex-1 aspect-square rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
                            intensityColors[intensity]
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {day ? (
                          <div className="text-center">
                            <p className="font-medium">{format(parseISO(day.day), 'MMM d, yyyy')}</p>
                            <p className="text-sm">{formatCurrency(day.value)}</p>
                            <p className="text-xs text-muted-foreground">{day.transactions} transactions</p>
                          </div>
                        ) : (
                          <span>No data</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {intensityColors.map((color, i) => (
              <div key={i} className={cn('h-3 w-3 rounded-sm', color)} />
            ))}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-lg font-bold">{formatCurrency(totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground">Total (90 days)</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{heatmapData.filter(d => d.value > 0).length}</p>
              <p className="text-[10px] text-muted-foreground">Active days</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-warning flex items-center justify-center gap-1">
                <Flame className="h-4 w-4" />
                {heatmapData.filter(d => d.value > avgDaily * 1.5).length}
              </p>
              <p className="text-[10px] text-muted-foreground">High spend days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
