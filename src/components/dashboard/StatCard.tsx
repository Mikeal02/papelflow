import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import { subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { Sparkline } from '@/components/ui/animated-counter';
import { CountUpValue } from '@/components/ui/CountUpValue';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  autoCompare?: 'income' | 'expense' | 'net';
}

export const StatCard = memo(function StatCard({ title, value, change, icon: Icon, iconColor, delay = 0, autoCompare }: StatCardProps) {
  const { data: transactions = [] } = useTransactions();

  const { computedChange, sparklineData, trend } = useMemo(() => {
    const now = new Date();
    const curStart = startOfMonth(now);
    const curEnd = endOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    const filterType = autoCompare === 'net' ? undefined : autoCompare;

    let changeValue = change;
    if (change === undefined && autoCompare && transactions.length > 0) {
      const curTotal = transactions
        .filter(t => {
          const d = new Date(t.date);
          return d >= curStart && d <= curEnd && (!filterType || t.type === filterType);
        })
        .reduce((s, t) => {
          if (autoCompare === 'net') return s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
          return s + Number(t.amount);
        }, 0);

      const prevTotal = transactions
        .filter(t => {
          const d = new Date(t.date);
          return d >= prevStart && d <= prevEnd && (!filterType || t.type === filterType);
        })
        .reduce((s, t) => {
          if (autoCompare === 'net') return s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
          return s + Number(t.amount);
        }, 0);

      if (prevTotal !== 0) {
        changeValue = ((curTotal - prevTotal) / Math.abs(prevTotal)) * 100;
      }
    }

    const last14Days = eachDayOfInterval({
      start: subMonths(now, 0.5),
      end: now,
    }).slice(-14);

    const dailyData = last14Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return transactions
        .filter(t => {
          const tDate = t.date?.slice(0, 10);
          if (tDate !== dayStr) return false;
          if (!filterType) return true;
          return t.type === filterType;
        })
        .reduce((s, t) => {
          if (autoCompare === 'net') return s + (t.type === 'income' ? Number(t.amount) : -Number(t.amount));
          return s + Number(t.amount);
        }, 0);
    });

    const recent = dailyData.slice(-7).reduce((a, b) => a + b, 0);
    const previous = dailyData.slice(0, 7).reduce((a, b) => a + b, 0);
    const trendValue = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

    return {
      computedChange: changeValue,
      sparklineData: dailyData,
      trend: trendValue > 5 ? 'up' as const : trendValue < -5 ? 'down' as const : 'stable' as const,
    };
  }, [change, autoCompare, transactions]);

  const isPositive = computedChange !== undefined && computedChange > 0;
  const isNegative = computedChange !== undefined && computedChange < 0;
  const accentColor = autoCompare === 'income' ? 'income' : autoCompare === 'expense' ? 'expense' : 'primary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="stat-card group h-full relative overflow-hidden transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg"
    >
      {/* Hover-only glow — CSS only */}
      <div className={cn(
        "absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        autoCompare === 'income' && "bg-income/20",
        autoCompare === 'expense' && "bg-expense/20",
        autoCompare === 'net' && "bg-primary/20",
        !autoCompare && "bg-accent/20"
      )} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="space-y-2 min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            {trend === 'up' && autoCompare === 'income' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-income/10 text-income font-medium flex items-center gap-0.5 shrink-0">
                <Sparkles className="h-2.5 w-2.5" />
                Hot
              </span>
            )}
          </div>
          
          <CountUpValue value={value} className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight block truncate" />
          
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {sparklineData.some(v => v > 0) && (
              <Sparkline 
                data={sparklineData} 
                width={60} 
                height={20} 
                color={autoCompare === 'income' ? 'hsl(var(--income))' : autoCompare === 'expense' ? 'hsl(var(--expense))' : undefined}
              />
            )}
            {computedChange !== undefined && (
              <div 
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0",
                  isPositive && "bg-income/10 text-income",
                  isNegative && "bg-expense/10 text-expense",
                  !isPositive && !isNegative && "bg-muted text-muted-foreground"
                )}
              >
                {isPositive ? <TrendingUp className="h-3 w-3 shrink-0" /> : isNegative ? <TrendingDown className="h-3 w-3 shrink-0" /> : <Minus className="h-3 w-3 shrink-0" />}
                <span>{isPositive ? '+' : ''}{computedChange.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Static icon */}
        <div
          className={cn(
            'relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl transition-transform duration-300 flex-shrink-0 group-hover:scale-110',
            iconColor || 'bg-gradient-to-br from-primary/20 to-primary/10'
          )}
        >
          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6 relative z-10', iconColor ? 'text-inherit' : 'text-primary')} />
        </div>
      </div>

      {/* Bottom accent line — CSS only */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-[2px] w-[60%] rounded-full",
          `bg-gradient-to-r from-${accentColor} via-${accentColor}/50 to-transparent`
        )}
      />
    </motion.div>
  );
});
