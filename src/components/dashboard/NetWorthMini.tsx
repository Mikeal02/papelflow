import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useMemo } from 'react';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function NetWorthMini() {
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const { trendData, currentNetWorth, change, changePercent } = useMemo(() => {
    const currentBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      data.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        net: income - expenses,
        cumulative: 0,
      });
    }

    // Build cumulative from estimated starting point
    let cumulative = currentBalance;
    for (let i = data.length - 1; i >= 0; i--) {
      cumulative -= data[i].net;
    }
    data.forEach(d => {
      cumulative += d.net;
      d.cumulative = cumulative;
    });

    const prevMonth = data.length >= 2 ? data[data.length - 2].cumulative : currentBalance;
    const monthChange = currentBalance - prevMonth;
    const pct = prevMonth !== 0 ? (monthChange / Math.abs(prevMonth)) * 100 : 0;

    return {
      trendData: data,
      currentNetWorth: currentBalance,
      change: monthChange,
      changePercent: pct,
    };
  }, [accounts, transactions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
      className="stat-card col-span-2"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Net Worth Trend</h3>
            <p className="text-[10px] text-muted-foreground">6-month trajectory</p>
          </div>
        </div>
        <Link to="/net-worth">
          <Button variant="ghost" size="sm" className="text-primary h-7 text-xs">
            Details →
          </Button>
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold truncate">{formatCurrency(currentNetWorth)}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {change >= 0 ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-income" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-expense" />
            )}
            <span className={cn('text-xs font-bold', change >= 0 ? 'text-income' : 'text-expense')}>
              {change >= 0 ? '+' : ''}{formatCurrency(change)}
            </span>
            <span className={cn('text-[10px] font-medium', change >= 0 ? 'text-income' : 'text-expense')}>
              ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div className="h-[60px] w-[140px] sm:w-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#netWorthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
