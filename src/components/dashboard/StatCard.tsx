import { useMemo, memo, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
  const accentVar = autoCompare === 'income' ? '--income' : autoCompare === 'expense' ? '--expense' : autoCompare === 'net' ? '--primary' : '--accent';

  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="elite-card group relative flex h-full flex-col overflow-hidden"
    >
      {/* Accent hairline along the top edge — reads as a label, not a stripe */}
      <div
        aria-hidden
        className="h-[2px] w-full opacity-80 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, hsl(var(${accentVar}) / 0.9), hsl(var(${accentVar}) / 0.12))`,
        }}
      />

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
            <p className="text-eyebrow truncate">{title}</p>
            <CountUpValue
              value={value}
              className="block truncate text-[1.375rem] font-semibold leading-tight tracking-[-0.03em] text-numeric sm:text-[1.5rem] lg:text-[1.75rem]"
            />
          </div>

          <div
            className={cn(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] ring-1 ring-inset ring-border/50 transition-transform duration-200 group-hover:scale-[1.04] sm:h-10 sm:w-10',
              iconColor || 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </div>
        </div>

        {/* Footer: trend badge + sparkline, separated by a soft rule */}
        {(computedChange !== undefined || sparklineData.some((v) => v > 0)) && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
            {computedChange !== undefined ? (
              <div
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                  isPositive && 'border-income/20 bg-income/10 text-income',
                  isNegative && 'border-expense/20 bg-expense/10 text-expense',
                  !isPositive && !isNegative && 'border-border/40 bg-muted text-muted-foreground',
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 shrink-0" />
                ) : isNegative ? (
                  <TrendingDown className="h-3 w-3 shrink-0" />
                ) : (
                  <Minus className="h-3 w-3 shrink-0" />
                )}
                <span className="text-numeric">
                  {isPositive ? '+' : ''}
                  {computedChange.toFixed(1)}%
                </span>
                <span className="hidden font-medium text-muted-foreground/70 sm:inline">vs last mo</span>
              </div>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground/60">Last 14 days</span>
            )}

            {sparklineData.some((v) => v > 0) && (
              <Sparkline
                data={sparklineData}
                width={64}
                height={20}
                color={
                  autoCompare === 'income'
                    ? 'hsl(var(--income))'
                    : autoCompare === 'expense'
                      ? 'hsl(var(--expense))'
                      : 'hsl(var(--primary))'
                }
              />
            )}
          </div>
        )}
      </div>
    </motion.div>

  );
});
