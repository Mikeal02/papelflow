import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown, Wallet, Building2, CreditCard, PiggyBank, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';

const NetWorth = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const { formatCurrency } = useCurrency();

  const { assets, liabilities, totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    const assetAccounts = accounts.filter(
      (a) => a.type !== 'credit_card' && a.type !== 'loan'
    );
    const liabilityAccounts = accounts.filter(
      (a) => a.type === 'credit_card' || a.type === 'loan'
    );

    const totalAsset = assetAccounts.reduce((sum, a) => sum + Math.max(0, Number(a.balance || 0)), 0);
    const totalLiability = Math.abs(
      liabilityAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)
    );

    return {
      assets: assetAccounts,
      liabilities: liabilityAccounts,
      totalAssets: totalAsset,
      totalLiabilities: totalLiability,
      netWorth: totalAsset - totalLiability,
    };
  }, [accounts]);

  // Mock historical data - in a real app, this would come from the database
  const netWorthHistory = [
    { month: 'Jul', netWorth: Math.max(0, netWorth * 0.85) },
    { month: 'Aug', netWorth: Math.max(0, netWorth * 0.88) },
    { month: 'Sep', netWorth: Math.max(0, netWorth * 0.91) },
    { month: 'Oct', netWorth: Math.max(0, netWorth * 0.94) },
    { month: 'Nov', netWorth: Math.max(0, netWorth * 0.97) },
    { month: 'Dec', netWorth: Math.max(0, netWorth * 0.99) },
    { month: 'Jan', netWorth: netWorth },
  ];

  const previousMonth = netWorth * 0.99;
  const monthlyChange = netWorth - previousMonth;
  const percentChange = previousMonth > 0 ? ((monthlyChange / previousMonth) * 100).toFixed(1) : '0';

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold">Net Worth</h1>
          <p className="text-muted-foreground mt-1">
            Your complete financial picture
          </p>
        </motion.div>

        {/* Main Net Worth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card glow-effect"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Net Worth</p>
              <p
                className={cn(
                  'text-5xl font-bold',
                  netWorth >= 0 ? 'text-income' : 'text-expense'
                )}
              >
                {formatCurrency(netWorth)}
              </p>
              {accounts.length > 0 && (
                <div className="flex items-center gap-2">
                  {monthlyChange >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-income" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-expense" />
                  )}
                  <span
                    className={cn(
                      'text-sm font-medium',
                      monthlyChange >= 0 ? 'text-income' : 'text-expense'
                    )}
                  >
                    {formatCurrency(monthlyChange, true)} ({percentChange}%) this month
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10 mx-auto mb-2">
                  <TrendingUp className="h-6 w-6 text-income" />
                </div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-xl font-bold text-income">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-expense/10 mx-auto mb-2">
                  <TrendingDown className="h-6 w-6 text-expense" />
                </div>
                <p className="text-sm text-muted-foreground">Liabilities</p>
                <p className="text-xl font-bold text-expense">
                  {formatCurrency(totalLiabilities)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Net Worth Chart */}
        {accounts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <h3 className="text-lg font-semibold mb-6">Net Worth Over Time</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthHistory}>
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(215, 25%, 55%)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(215, 25%, 55%)"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 10%)',
                      border: '1px solid hsl(222, 30%, 18%)',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      'Net Worth',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="hsl(160, 84%, 45%)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#netWorthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Breakdown */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Assets Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="stat-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-income/10">
                <TrendingUp className="h-5 w-5 text-income" />
              </div>
              <div>
                <h3 className="font-semibold">Assets</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
            </div>

            {assets.length > 0 ? (
              <div className="space-y-4">
                {assets.map((account, index) => {
                  const percentage = totalAssets > 0 ? (Number(account.balance || 0) / totalAssets) * 100 : 0;
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + index * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${account.color || '#10B981'}20` }}
                          >
                            {account.type === 'bank' && (
                              <Building2 className="h-4 w-4" style={{ color: account.color || '#10B981' }} />
                            )}
                            {account.type === 'cash' && (
                              <Wallet className="h-4 w-4" style={{ color: account.color || '#10B981' }} />
                            )}
                            {account.type === 'investment' && (
                              <PiggyBank className="h-4 w-4" style={{ color: account.color || '#10B981' }} />
                            )}
                            {account.type === 'wallet' && (
                              <Wallet className="h-4 w-4" style={{ color: account.color || '#10B981' }} />
                            )}
                          </div>
                          <span className="font-medium">{account.name}</span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(Number(account.balance || 0))}
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.4 + index * 0.05, duration: 0.6 }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ backgroundColor: account.color || '#10B981' }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <Wallet className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium">No asset accounts</p>
                <p className="text-sm text-muted-foreground">
                  Add accounts to track your assets
                </p>
              </div>
            )}
          </motion.div>

          {/* Liabilities Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="stat-card"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/10">
                <TrendingDown className="h-5 w-5 text-expense" />
              </div>
              <div>
                <h3 className="font-semibold">Liabilities</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(totalLiabilities)}
                </p>
              </div>
            </div>

            {liabilities.length > 0 ? (
              <div className="space-y-4">
                {liabilities.map((account, index) => {
                  const percentage = totalLiabilities > 0
                    ? (Math.abs(Number(account.balance || 0)) / totalLiabilities) * 100
                    : 0;
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${account.color || '#EF4444'}20` }}
                          >
                            <CreditCard
                              className="h-4 w-4"
                              style={{ color: account.color || '#EF4444' }}
                            />
                          </div>
                          <span className="font-medium">{account.name}</span>
                        </div>
                        <span className="font-semibold text-expense">
                          {formatCurrency(Math.abs(Number(account.balance || 0)))}
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.45 + index * 0.05, duration: 0.6 }}
                          className="absolute inset-y-0 left-0 rounded-full bg-expense"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10 mb-3">
                  <TrendingUp className="h-6 w-6 text-income" />
                </div>
                <p className="font-medium">No liabilities!</p>
                <p className="text-sm text-muted-foreground">
                  You're debt-free. Keep it up!
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NetWorth;
