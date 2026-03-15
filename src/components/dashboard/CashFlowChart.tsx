import { memo, useMemo, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const CustomTooltip = ({ active, payload, label, formatCurrency }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
      <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(Math.abs(entry.value))}
        </p>
      ))}
    </div>
  );
};

export const CashFlowChart = memo(function CashFlowChart() {
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const data = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      result.push({ month: format(date, 'MMM'), income, expenses: -expenses });
    }
    return result;
  }, [transactions]);

  const renderTooltip = useCallback((props: any) => <CustomTooltip {...props} formatCurrency={formatCurrency} />, [formatCurrency]);

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Cash Flow</h3>
          <p className="text-[10px] text-muted-foreground">Last 6 months income vs expenses</p>
        </div>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
            <XAxis dataKey="month" fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={9} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={35} />
            <Tooltip content={renderTooltip} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} name="Income" />
            <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[0, 0, 4, 4]} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
