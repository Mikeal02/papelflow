import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockAccounts, getNetWorth } from '@/lib/mock-data';
import { TrendingUp, TrendingDown, Wallet, Building2, CreditCard, PiggyBank } from 'lucide-react';
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

const netWorthHistory = [
  { month: 'Jul', netWorth: 32000 },
  { month: 'Aug', netWorth: 34500 },
  { month: 'Sep', netWorth: 35200 },
  { month: 'Oct', netWorth: 37800 },
  { month: 'Nov', netWorth: 38500 },
  { month: 'Dec', netWorth: 39100 },
  { month: 'Jan', netWorth: 40300 },
];

const NetWorth = () => {
  const netWorth = getNetWorth();

  const assets = mockAccounts.filter(
    (a) => a.type !== 'credit_card' && a.type !== 'loan'
  );
  const liabilities = mockAccounts.filter(
    (a) => a.type === 'credit_card' || a.type === 'loan'
  );

  const totalAssets = assets.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalLiabilities = Math.abs(
    liabilities.reduce((sum, a) => sum + a.balance, 0)
  );

  const monthlyChange = netWorth - 39100;
  const percentChange = ((monthlyChange / 39100) * 100).toFixed(1);

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
                {netWorth < 0 && '-'}$
                {Math.abs(netWorth).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </p>
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
                  {monthlyChange >= 0 ? '+' : ''}$
                  {monthlyChange.toLocaleString()} ({percentChange}%) this month
                </span>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10 mx-auto mb-2">
                  <TrendingUp className="h-6 w-6 text-income" />
                </div>
                <p className="text-sm text-muted-foreground">Assets</p>
                <p className="text-xl font-bold text-income">
                  ${totalAssets.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-expense/10 mx-auto mb-2">
                  <TrendingDown className="h-6 w-6 text-expense" />
                </div>
                <p className="text-sm text-muted-foreground">Liabilities</p>
                <p className="text-xl font-bold text-expense">
                  ${totalLiabilities.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Net Worth Chart */}
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
                    <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 22%)" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 13%)',
                    border: '1px solid hsl(222, 30%, 22%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                  formatter={(value: number) => [
                    `$${value.toLocaleString()}`,
                    'Net Worth',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="hsl(160, 84%, 39%)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#netWorthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

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
                  ${totalAssets.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {assets.map((account, index) => {
                const percentage = (account.balance / totalAssets) * 100;
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
                          style={{ backgroundColor: `${account.color}20` }}
                        >
                          {account.type === 'bank' && (
                            <Building2 className="h-4 w-4" style={{ color: account.color }} />
                          )}
                          {account.type === 'cash' && (
                            <Wallet className="h-4 w-4" style={{ color: account.color }} />
                          )}
                          {account.type === 'investment' && (
                            <PiggyBank className="h-4 w-4" style={{ color: account.color }} />
                          )}
                        </div>
                        <span className="font-medium">{account.name}</span>
                      </div>
                      <span className="font-semibold">
                        ${account.balance.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.4 + index * 0.05, duration: 0.6 }}
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
                  ${totalLiabilities.toLocaleString()}
                </p>
              </div>
            </div>

            {liabilities.length > 0 ? (
              <div className="space-y-4">
                {liabilities.map((account, index) => {
                  const percentage =
                    (Math.abs(account.balance) / totalLiabilities) * 100;
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
                            style={{ backgroundColor: `${account.color}20` }}
                          >
                            <CreditCard
                              className="h-4 w-4"
                              style={{ color: account.color }}
                            />
                          </div>
                          <span className="font-medium">{account.name}</span>
                        </div>
                        <span className="font-semibold text-expense">
                          ${Math.abs(account.balance).toLocaleString()}
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
