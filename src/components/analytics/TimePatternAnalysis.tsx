import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const TimePatternAnalysis = () => {
  const { dayOfWeekData, timeOfDayData } = useAdvancedAnalytics();
  const { formatCurrency } = useCurrency();

  const maxDayAmount = Math.max(...dayOfWeekData.map(d => d.amount));
  const maxHourAmount = Math.max(...timeOfDayData.map(d => d.amount));

  // Group hours into time blocks for radar
  const timeBlocks = useMemo(() => {
    const blocks = [
      { name: 'Early Morning', hours: [5, 6, 7, 8], shortName: '5-8am' },
      { name: 'Morning', hours: [9, 10, 11], shortName: '9-11am' },
      { name: 'Lunch', hours: [12, 13, 14], shortName: '12-2pm' },
      { name: 'Afternoon', hours: [15, 16, 17], shortName: '3-5pm' },
      { name: 'Evening', hours: [18, 19, 20], shortName: '6-8pm' },
      { name: 'Night', hours: [21, 22, 23, 0, 1, 2, 3, 4], shortName: '9pm-4am' },
    ];

    return blocks.map(block => {
      const total = block.hours.reduce((sum, hour) => {
        const data = timeOfDayData.find(d => d.hour === hour);
        return sum + (data?.amount || 0);
      }, 0);
      return {
        subject: block.shortName,
        A: total,
        fullMark: maxHourAmount * block.hours.length,
      };
    });
  }, [timeOfDayData, maxHourAmount]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-2 shadow-lg text-xs">
          <p className="font-medium">{label}</p>
          <p>{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Spending Patterns
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Day of Week Bar Chart */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">By Day of Week</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData}>
                    <XAxis 
                      dataKey="dayName" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="amount" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Peak day indicator */}
              {dayOfWeekData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-center text-xs text-muted-foreground"
                >
                  Peak spending:{' '}
                  <span className="font-bold text-foreground">
                    {dayOfWeekData.reduce((max, d) => d.amount > max.amount ? d : max, dayOfWeekData[0]).dayName}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Time of Day Radar */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3">By Time of Day</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={timeBlocks}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 'auto']} 
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="Spending"
                      dataKey="A"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Day pills visualization */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-xs font-medium text-muted-foreground mb-3">Daily Breakdown</h4>
            <div className="flex gap-1.5">
              {dayOfWeekData.map((day, i) => {
                const intensity = maxDayAmount > 0 ? (day.amount / maxDayAmount) : 0;
                
                return (
                  <motion.div
                    key={day.day}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-1"
                  >
                    <div
                      className={cn(
                        'h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all',
                        intensity > 0.8 && 'bg-primary text-primary-foreground',
                        intensity > 0.5 && intensity <= 0.8 && 'bg-primary/70 text-primary-foreground',
                        intensity > 0.3 && intensity <= 0.5 && 'bg-primary/40',
                        intensity <= 0.3 && 'bg-muted/50'
                      )}
                    >
                      {day.dayName.slice(0, 1)}
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center mt-1">
                      {formatCurrency(day.amount)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
