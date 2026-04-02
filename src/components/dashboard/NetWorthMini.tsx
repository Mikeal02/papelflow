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
import { TiltCard } from '@/components/ui/tilt-card';
import { GradientBadge, ShineEffect } from '@/components/ui/glowing-border';
import { CountUpValue } from '@/components/ui/CountUpValue';
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22 }}
    >
      <TiltCard className="stat-card h-full">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div 
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary shadow-lg shrink-0"
              animate={{ boxShadow: ['0 0 0 0 hsl(var(--accent) / 0)', '0 0 20px 5px hsl(var(--accent) / 0.3)', '0 0 0 0 hsl(var(--accent) / 0)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </motion.div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">Net Worth</h3>
              <p className="text-[10px] text-muted-foreground">6-month trajectory</p>
            </div>
          </div>
          <Link to="/net-worth" className="shrink-0">
            <Button variant="ghost" size="sm" className="text-primary h-7 text-xs">
              Details →
            </Button>
          </Link>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1 overflow-hidden">
            <ShineEffect>
              <CountUpValue value={formatCurrency(currentNetWorth)} className="text-xl sm:text-2xl lg:text-3xl font-bold block truncate" duration={1800} />
            </ShineEffect>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <GradientBadge variant={change >= 0 ? 'success' : 'warning'}>
                {change >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span className="truncate max-w-[80px]">{change >= 0 ? '+' : ''}{formatCurrency(change)}</span>
              </GradientBadge>
              <span className={cn('text-[10px] font-medium shrink-0', change >= 0 ? 'text-income' : 'text-expense')}>
                ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="h-[60px] w-[120px] sm:w-[160px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="netWorthGradElite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2.5}
                  fill="url(#netWorthGradElite)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}
