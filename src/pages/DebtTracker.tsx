import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, TrendingDown, Calculator, Flame, Snowflake, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';

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
        interestRate: a.type === 'credit_card' ? 19.99 : 5.5, // Default rates
        minPayment: Math.max(Math.abs(Number(a.balance)) * 0.02, 25),
      })),
    [accounts]
  );

  const totalDebt = debtAccounts.reduce((s, a) => s + a.owed, 0);
  const totalMinPayment = debtAccounts.reduce((s, a) => s + a.minPayment, 0);
  const avgRate = debtAccounts.length > 0
    ? debtAccounts.reduce((s, a) => s + a.interestRate * a.owed, 0) / totalDebt
    : 0;

  // Simple payoff timeline estimate
  const monthsToPayoff = useMemo(() => {
    if (totalDebt === 0 || monthlyPayment <= 0) return 0;
    const monthlyRate = avgRate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(totalDebt / monthlyPayment);
    const months = -Math.log(1 - (totalDebt * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
    return Math.ceil(isFinite(months) && months > 0 ? months : totalDebt / monthlyPayment);
  }, [totalDebt, monthlyPayment, avgRate]);

  const totalInterest = useMemo(() => {
    return Math.max(0, monthsToPayoff * monthlyPayment - totalDebt);
  }, [monthsToPayoff, monthlyPayment, totalDebt]);

  const sortedDebts = useMemo(() => {
    const sorted = [...debtAccounts];
    if (strategy === 'avalanche') {
      sorted.sort((a, b) => b.interestRate - a.interestRate);
    } else {
      sorted.sort((a, b) => a.owed - b.owed);
    }
    return sorted;
  }, [debtAccounts, strategy]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Debt Tracker</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {debtAccounts.length} debt accounts tracked
            </p>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CreditCard, label: 'Total Debt', value: formatCurrency(totalDebt), color: 'expense', sub: `${debtAccounts.length} accounts` },
            { icon: TrendingDown, label: 'Min. Payment', value: formatCurrency(totalMinPayment), color: 'warning', sub: 'per month' },
            { icon: Calculator, label: 'Payoff Timeline', value: `${monthsToPayoff} months`, color: 'primary', sub: `~${(monthsToPayoff / 12).toFixed(1)} years` },
            { icon: AlertTriangle, label: 'Total Interest', value: formatCurrency(totalInterest), color: 'expense', sub: `${avgRate.toFixed(1)}% avg rate` },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="stat-card"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-${item.color}/10`}>
                  <item.icon className={`h-5 w-5 text-${item.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Payment Slider */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-4">Monthly Payment Plan</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly payment amount</span>
              <span className="text-lg font-bold">{formatCurrency(monthlyPayment)}</span>
            </div>
            <input
              type="range"
              min={Math.ceil(totalMinPayment)}
              max={Math.max(totalDebt * 0.1, totalMinPayment * 5)}
              value={monthlyPayment}
              onChange={e => setMonthlyPayment(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: {formatCurrency(totalMinPayment)}</span>
              <span>Aggressive: {formatCurrency(Math.max(totalDebt * 0.1, totalMinPayment * 5))}</span>
            </div>
          </div>
        </motion.div>

        {/* Strategy Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Tabs value={strategy} onValueChange={v => setStrategy(v as any)} className="space-y-4">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="avalanche" className="gap-2">
                <Flame className="h-3.5 w-3.5" />
                Avalanche (Highest Rate)
              </TabsTrigger>
              <TabsTrigger value="snowball" className="gap-2">
                <Snowflake className="h-3.5 w-3.5" />
                Snowball (Lowest Balance)
              </TabsTrigger>
            </TabsList>

            <div className="space-y-3">
              {sortedDebts.length === 0 ? (
                <div className="stat-card flex flex-col items-center py-16">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-bold mb-2">No debt accounts</h3>
                  <p className="text-sm text-muted-foreground mb-4">Add credit card or loan accounts to start tracking debt</p>
                </div>
              ) : (
                sortedDebts.map((debt, i) => (
                  <motion.div
                    key={debt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="stat-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/10 font-bold text-sm">
                          #{i + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold">{debt.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {debt.interestRate}% APR • Min: {formatCurrency(debt.minPayment)}/mo
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-expense">{formatCurrency(debt.owed)}</p>
                        <p className="text-[10px] text-muted-foreground">outstanding</p>
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
                ))
              )}
            </div>
          </Tabs>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default DebtTracker;
