import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Rocket, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useAccounts } from '@/hooks/useAccounts';
import { useMonthlyStats } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

export const FutureYouSimulator = () => {
  const { data: accounts = [] } = useAccounts();
  const { data: stats } = useMonthlyStats();
  const { formatCurrency } = useCurrency();

  const [extraSavings, setExtraSavings] = useState(0);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [years, setYears] = useState(10);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  const monthlySavings = Math.max(0, (stats?.income || 0) - (stats?.expenses || 0));

  const projection = useMemo(() => {
    const data = [];
    const monthlyRate = annualReturn / 100 / 12;
    const totalMonthlySave = monthlySavings + extraSavings;
    let balanceCurrent = totalBalance;
    let balanceOptimized = totalBalance;

    for (let y = 0; y <= years; y++) {
      data.push({
        year: `Year ${y}`,
        current: Math.round(balanceCurrent),
        optimized: Math.round(balanceOptimized),
      });
      for (let m = 0; m < 12; m++) {
        balanceCurrent = balanceCurrent * (1 + monthlyRate) + monthlySavings;
        balanceOptimized = balanceOptimized * (1 + monthlyRate) + totalMonthlySave;
      }
    }
    return data;
  }, [totalBalance, monthlySavings, extraSavings, annualReturn, years]);

  const finalCurrent = projection[projection.length - 1]?.current || 0;
  const finalOptimized = projection[projection.length - 1]?.optimized || 0;
  const difference = finalOptimized - finalCurrent;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
        <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-bold" style={{ color: entry.color }}>
            {entry.name === 'current' ? 'Current path' : 'Optimized'}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          Future You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs font-medium">Extra monthly savings</span>
              <span className="text-xs font-bold text-income">{formatCurrency(extraSavings)}</span>
            </div>
            <Slider value={[extraSavings]} onValueChange={([v]) => setExtraSavings(v)} max={1000} step={50} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] font-medium">Return %</span>
                <span className="text-[10px] font-bold">{annualReturn}%</span>
              </div>
              <Slider value={[annualReturn]} onValueChange={([v]) => setAnnualReturn(v)} min={0} max={15} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-[10px] font-medium">Years</span>
                <span className="text-[10px] font-bold">{years}</span>
              </div>
              <Slider value={[years]} onValueChange={([v]) => setYears(v)} min={1} max={30} step={1} />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="futureCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="futureOptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" fontSize={9} tickLine={false} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={9} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="current" name="current" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#futureCurrentGrad)" />
              <Area type="monotone" dataKey="optimized" name="optimized" stroke="hsl(var(--income))" strokeWidth={2} fill="url(#futureOptGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Current Path</p>
            <p className="text-sm font-bold">{formatCurrency(finalCurrent)}</p>
          </div>
          <div className="rounded-xl bg-income/5 border border-income/20 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Optimized</p>
            <p className="text-sm font-bold text-income">{formatCurrency(finalOptimized)}</p>
          </div>
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Difference</p>
            <p className="text-sm font-bold text-primary">+{formatCurrency(difference)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
