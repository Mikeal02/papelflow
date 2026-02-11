import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, TrendingDown, Calculator, Flame, Snowflake, Loader2, AlertTriangle, DollarSign, Calendar, Target, ArrowRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const DebtTracker = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const { formatCurrency } = useCurrency();
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [monthlyPayment, setMonthlyPayment] = useState(500);

  const debtAccounts = useMemo(() =>
    accounts
      .filter(a => a.type === 'credit_card' || a.type === 'loan')
      .map(a => ({
        ...a,
        owed: Math.abs(Number(a.balance)),
        interestRate: a.type === 'credit_card' ? 19.99 : 5.5,
        minPayment: Math.max(Math.abs(Number(a.balance)) * 0.02, 25),
      })),
    [accounts]
  );

  const totalDebt = debtAccounts.reduce((s, a) => s + a.owed, 0);
  const totalMinPayment = debtAccounts.reduce((s, a) => s + a.minPayment, 0);
  const avgRate = debtAccounts.length > 0 ? debtAccounts.reduce((s, a) => s + a.interestRate * a.owed, 0) / (totalDebt || 1) : 0;
  const highestRate = debtAccounts.length > 0 ? Math.max(...debtAccounts.map(a => a.interestRate)) : 0;

  const monthsToPayoff = useMemo(() => {
    if (totalDebt === 0 || monthlyPayment <= 0) return 0;
    const monthlyRate = avgRate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(totalDebt / monthlyPayment);
    const months = -Math.log(1 - (totalDebt * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(isFinite(months) && months > 0 ? months : totalDebt / monthlyPayment);
  }, [totalDebt, monthlyPayment, avgRate]);

  const totalInterest = useMemo(() => Math.max(0, monthsToPayoff * monthlyPayment - totalDebt), [monthsToPayoff, monthlyPayment, totalDebt]);

  const payoffProjection = useMemo(() => {
    const data = [];
    let remaining = totalDebt;
    const monthlyRate = avgRate / 100 / 12;
    for (let i = 0; i <= Math.min(monthsToPayoff, 60); i += Math.max(1, Math.floor(monthsToPayoff / 12))) {
      data.push({ month: `M${i}`, remaining: Math.max(0, remaining) });
      for (let j = 0; j < Math.max(1, Math.floor(monthsToPayoff / 12)); j++) {
        remaining = remaining * (1 + monthlyRate) - monthlyPayment;
        if (remaining <= 0) { remaining = 0; break; }
      }
    }
    if (data.length > 0 && data[data.length - 1].remaining > 0) {
      data.push({ month: `M${monthsToPayoff}`, remaining: 0 });
    }
    return data;
  }, [totalDebt, monthlyPayment, avgRate, monthsToPayoff]);

  const sortedDebts = useMemo(() => {
    const sorted = [...debtAccounts];
    if (strategy === 'avalanche') sorted.sort((a, b) => b.interestRate - a.interestRate);
    else sorted.sort((a, b) => a.owed - b.owed);
    return sorted;
  }, [debtAccounts, strategy]);

  // Interest breakdown per debt
  const interestBreakdown = useMemo(() => {
    return debtAccounts.map(d => ({
      name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
      monthly: (d.owed * d.interestRate / 100 / 12),
      yearly: (d.owed * d.interestRate / 100),
    }));
  }, [debtAccounts]);

  const maxPayment = Math.max(totalDebt * 0.1, totalMinPayment * 5, 1000);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
        <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>{formatCurrency(entry.value)}</p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading debt tracker...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Debt Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">{debtAccounts.length} debt accounts tracked</p>
          </div>
          {debtAccounts.length > 0 && (
            <Badge variant="outline" className="self-start sm:self-auto text-xs">
              Debt-free by {new Date(Date.now() + monthsToPayoff * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </Badge>
          )}
        </motion.div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, label: 'Total Debt', value: formatCurrency(totalDebt), sub: `${debtAccounts.length} accounts`, color: 'expense' },
            { icon: DollarSign, label: 'Min Payment', value: formatCurrency(totalMinPayment), sub: 'per month', color: 'warning' },
            { icon: Calendar, label: 'Payoff Timeline', value: `${monthsToPayoff} mo`, sub: `~${(monthsToPayoff / 12).toFixed(1)} years`, color: 'primary' },
            { icon: AlertTriangle, label: 'Total Interest', value: formatCurrency(totalInterest), sub: `${avgRate.toFixed(1)}% avg / ${highestRate}% max`, color: 'expense' },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03 }} className="stat-card p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${item.color}/10 shrink-0`}>
                  <item.icon className={`h-4 w-4 text-${item.color}`} />
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground font-medium truncate">{item.label}</span>
              </div>
              <p className="text-base md:text-lg font-bold truncate">{item.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Payment Slider + Payoff Chart */}
        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
            <h3 className="font-semibold text-sm mb-4">Monthly Payment Plan</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Monthly payment</span>
                <span className="text-xl font-bold">{formatCurrency(monthlyPayment)}</span>
              </div>
              <Slider
                value={[monthlyPayment]}
                onValueChange={([v]) => setMonthlyPayment(v)}
                min={Math.ceil(totalMinPayment) || 25}
                max={maxPayment}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {formatCurrency(totalMinPayment || 25)}</span>
                <span>Max: {formatCurrency(maxPayment)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Months</p>
                  <p className="text-lg font-bold">{monthsToPayoff}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Interest</p>
                  <p className="text-lg font-bold text-expense">{formatCurrency(totalInterest)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold">{formatCurrency(monthsToPayoff * monthlyPayment)}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="stat-card">
            <h3 className="font-semibold text-sm mb-4">Payoff Projection</h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payoffProjection}>
                  <defs>
                    <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="remaining" stroke="hsl(var(--expense))" strokeWidth={2} fillOpacity={1} fill="url(#debtGrad)" name="Remaining" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Interest Breakdown */}
        {interestBreakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
            <h3 className="font-semibold text-sm mb-4">Monthly Interest by Account</h3>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interestBreakdown} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v.toFixed(0)}`} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="monthly" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} name="Monthly Interest" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Strategy Selector + Debt List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Tabs value={strategy} onValueChange={v => setStrategy(v as any)} className="space-y-4">
            <TabsList className="bg-muted/30 w-full sm:w-auto">
              <TabsTrigger value="avalanche" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
                <Flame className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Avalanche</span> (Rate)
              </TabsTrigger>
              <TabsTrigger value="snowball" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
                <Snowflake className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Snowball</span> (Balance)
              </TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {sortedDebts.length === 0 ? (
                <div className="stat-card flex flex-col items-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-income/20 to-accent/20 blur-2xl" />
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">No debt accounts</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">Add credit card or loan accounts to start tracking debt</p>
                </div>
              ) : (
                sortedDebts.map((debt, i) => {
                  const paidPercent = 0; // No opening_balance to compare, show full bar
                  return (
                    <motion.div
                      key={debt.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="stat-card"
                    >
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/10 font-bold text-sm shrink-0">
                            #{i + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">{debt.name}</h4>
                              <Badge variant="outline" className="text-[9px] shrink-0">{debt.interestRate}% APR</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Min: {formatCurrency(debt.minPayment)}/mo • Interest: {formatCurrency(debt.owed * debt.interestRate / 100 / 12)}/mo
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-expense">{formatCurrency(debt.owed)}</p>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          initial={{ width: '100%' }}
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-expense to-expense/60"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </Tabs>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default DebtTracker;
