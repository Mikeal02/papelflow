import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

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

  const computedChange = useMemo(() => {
    if (change !== undefined) return change;
    if (!autoCompare || transactions.length === 0) return undefined;

    const now = new Date();
    const curStart = startOfMonth(now);
    const curEnd = endOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    const filterType = autoCompare === 'net' ? undefined : autoCompare;

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

    if (prevTotal === 0) return undefined;
    return ((curTotal - prevTotal) / Math.abs(prevTotal)) * 100;
  }, [change, autoCompare, transactions]);

  const isPositive = computedChange !== undefined && computedChange > 0;
  const isNegative = computedChange !== undefined && computedChange < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="stat-card group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-[11px] sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold tracking-tight truncate">{value}</p>
          {computedChange !== undefined && (
            <div className="flex items-center gap-1.5">
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
                {computedChange.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 flex-shrink-0',
            iconColor || 'bg-primary/10'
          )}
        >
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', iconColor ? 'text-inherit' : 'text-primary')} />
        </div>
      </div>
    </motion.div>
  );
}
