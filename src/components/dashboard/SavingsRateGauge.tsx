import { motion } from 'framer-motion';
import { PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { cn } from '@/lib/utils';

export function SavingsRateGauge() {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const { currentRate, previousRate, monthlySavings } = useMemo(() => {
    const calc = (monthOffset: number) => {
      const date = subMonths(new Date(), monthOffset);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      return { income, expenses, rate: income > 0 ? ((income - expenses) / income) * 100 : 0, saved: income - expenses };
    };
    const current = calc(0);
    const previous = calc(1);
    return {
      currentRate: current.rate,
      previousRate: previous.rate,
      monthlySavings: current.saved,
    };
  }, [transactions]);

  const rateChange = currentRate - previousRate;
  const circumference = 2 * Math.PI * 45;
  const progress = Math.max(0, Math.min(currentRate, 100));
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="stat-card"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-income/20 to-income/10">
          <PiggyBank className="h-4 w-4 text-income" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Savings Rate</h3>
          <p className="text-[10px] text-muted-foreground">This month's savings percentage</p>
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="45" fill="none"
              stroke={currentRate >= 20 ? 'hsl(var(--income))' : currentRate >= 0 ? 'hsl(var(--warning))' : 'hsl(var(--expense))'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{currentRate.toFixed(0)}%</span>
            <span className="text-[10px] text-muted-foreground">saved</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] text-muted-foreground">Monthly savings</p>
          <p className={cn('text-sm font-bold', monthlySavings >= 0 ? 'text-income' : 'text-expense')}>
            {formatCurrency(Math.abs(monthlySavings))}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {rateChange >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-income" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-expense" />
          )}
          <span className={cn('text-xs font-bold', rateChange >= 0 ? 'text-income' : 'text-expense')}>
            {rateChange >= 0 ? '+' : ''}{rateChange.toFixed(1)}%
          </span>
          <span className="text-[10px] text-muted-foreground">vs last month</span>
        </div>
      </div>
    </motion.div>
  );
}
