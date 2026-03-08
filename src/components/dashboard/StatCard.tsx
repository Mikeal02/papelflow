import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import { subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { TiltCard } from '@/components/ui/tilt-card';
import { Sparkline } from '@/components/ui/animated-counter';

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  delay?: number;
  autoCompare?: 'income' | 'expense' | 'net';
}

export function StatCard({ title, value, change, icon: Icon, iconColor, delay = 0, autoCompare }: StatCardProps) {
  const { data: transactions = [] } = useTransactions();

  const { computedChange, sparklineData } = useMemo(() => {
    const now = new Date();
    const curStart = startOfMonth(now);
    const curEnd = endOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    const filterType = autoCompare === 'net' ? undefined : autoCompare;

    // Calculate change
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

    // Generate sparkline data (last 14 days)
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

    return {
      computedChange: changeValue,
      sparklineData: dailyData,
    };
  }, [change, autoCompare, transactions]);

  const isPositive = computedChange !== undefined && computedChange > 0;
  const isNegative = computedChange !== undefined && computedChange < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <TiltCard intensity={8} className="stat-card group h-full">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-base sm:text-2xl font-bold tracking-tight">{value}</p>
            
            {/* Sparkline + Change indicator */}
            <div className="flex items-center gap-3">
              {sparklineData.some(v => v > 0) && (
                <Sparkline data={sparklineData} width={60} height={20} />
              )}
              {computedChange !== undefined && (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-income shrink-0" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3 w-3 text-expense shrink-0" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-[10px] sm:text-xs font-medium truncate',
                      isPositive && 'text-income',
                      isNegative && 'text-expense',
                      !isPositive && !isNegative && 'text-muted-foreground'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {computedChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Glowing icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={cn(
              'flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl',
              'transition-all duration-300 flex-shrink-0',
              'shadow-lg',
              iconColor || 'bg-primary/10'
            )}
            style={{
              boxShadow: `0 4px 20px -4px hsl(var(--primary) / 0.3)`,
            }}
          >
            <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', iconColor ? 'text-inherit' : 'text-primary')} />
          </motion.div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
