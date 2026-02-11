import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown, Wallet, Building2, CreditCard, PiggyBank, Banknote, Loader2, ArrowUpRight, ArrowDownRight, Percent, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useMemo } from 'react';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

const COLORS = [
  'hsl(215, 85%, 55%)', 'hsl(155, 70%, 45%)', 'hsl(170, 75%, 45%)',
  'hsl(40, 95%, 50%)', 'hsl(0, 78%, 58%)', 'hsl(280, 70%, 55%)',
];

const accountIcons: Record<string, typeof Wallet> = {
  bank: Building2, cash: Banknote, credit_card: CreditCard,
  wallet: Wallet, loan: CreditCard, investment: PiggyBank,
};

const NetWorth = () => {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { formatCurrency } = useCurrency();

  const { assets, liabilities, totalAssets, totalLiabilities, netWorth } = useMemo(() => {
    const assetAccounts = accounts.filter(a => a.type !== 'credit_card' && a.type !== 'loan');
    const liabilityAccounts = accounts.filter(a => a.type === 'credit_card' || a.type === 'loan');
    const totalAsset = assetAccounts.reduce((sum, a) => sum + Math.max(0, Number(a.balance || 0)), 0);
    const totalLiability = Math.abs(liabilityAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0));
    return { assets: assetAccounts, liabilities: liabilityAccounts, totalAssets: totalAsset, totalLiabilities: totalLiability, netWorth: totalAsset - totalLiability };
  }, [accounts]);

  // Asset allocation pie data
  const assetAllocation = useMemo(() => {
    return assets.map(a => ({ name: a.name, value: Math.max(0, Number(a.balance || 0)) })).filter(a => a.value > 0);
  }, [assets]);

  // Monthly net worth trend from transactions
  const netWorthHistory = useMemo(() => {
    const result = [];
    let runningBalance = 0;
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
      runningBalance += income - expenses;
      result.push({ month: format(date, 'MMM'), netWorth: Math.max(0, netWorth + runningBalance - (income - expenses) * (12 - i) * 0.08) });
    }
    // Normalize so last month = current net worth
    if (result.length > 0) {
      const lastVal = result[result.length - 1].netWorth;
      const diff = netWorth - lastVal;
      result.forEach((r, i) => { r.netWorth = Math.max(0, r.netWorth + diff * (i / result.length)); });
      result[result.length - 1].netWorth = netWorth;
    }
    return result;
  }, [transactions, netWorth]);

  const previousMonth = netWorthHistory.length >= 2 ? netWorthHistory[netWorthHistory.length - 2].netWorth : netWorth * 0.99;
  const monthlyChange = netWorth - previousMonth;
  const percentChange = previousMonth > 0 ? ((monthlyChange / previousMonth) * 100).toFixed(1) : '0';

  // Debt-to-asset ratio
  const debtToAssetRatio = totalAssets > 0 ? ((totalLiabilities / totalAssets) * 100).toFixed(1) : '0';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
        <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const isLoading = accountsLoading || txLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading net worth...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold gradient-text">Net Worth</h1>
          <p className="text-sm text-muted-foreground mt-1">Your complete financial picture</p>
        </motion.div>

        {/* Main Net Worth Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="stat-card glow-effect"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Net Worth</p>
              <p className={cn('text-3xl md:text-5xl font-bold', netWorth >= 0 ? 'text-income' : 'text-expense')}>
                {formatCurrency(netWorth)}
              </p>
              {accounts.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    {monthlyChange >= 0 ? <ArrowUpRight className="h-4 w-4 text-income" /> : <ArrowDownRight className="h-4 w-4 text-expense" />}
                    <span className={cn('text-sm font-medium', monthlyChange >= 0 ? 'text-income' : 'text-expense')}>
                      {formatCurrency(Math.abs(monthlyChange))} ({percentChange}%)
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">This month</Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <div className="text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-income/10 mx-auto mb-1.5">
                  <TrendingUp className="h-5 w-5 text-income" />
                </div>
                <p className="text-[10px] text-muted-foreground">Assets</p>
                <p className="text-sm md:text-base font-bold text-income truncate">{formatCurrency(totalAssets)}</p>
              </div>
              <div className="text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-expense/10 mx-auto mb-1.5">
                  <TrendingDown className="h-5 w-5 text-expense" />
                </div>
                <p className="text-[10px] text-muted-foreground">Liabilities</p>
                <p className="text-sm md:text-base font-bold text-expense truncate">{formatCurrency(totalLiabilities)}</p>
              </div>
              <div className="text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-1.5">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground">Debt Ratio</p>
                <p className="text-sm md:text-base font-bold text-primary">{debtToAssetRatio}%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Chart + Allocation */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
          {/* Net Worth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card lg:col-span-2"
          >
            <h3 className="text-sm md:text-base font-semibold mb-4">Net Worth Trend (12 months)</h3>
            <div className="h-[220px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthHistory}>
                  <defs>
                    <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={42} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--income))" strokeWidth={2.5} fillOpacity={1} fill="url(#nwGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Asset Allocation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="stat-card"
          >
            <h3 className="text-sm md:text-base font-semibold mb-3">Asset Allocation</h3>
            {assetAllocation.length > 0 ? (
              <>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={assetAllocation} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {assetAllocation.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-2">
                  {assetAllocation.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs truncate flex-1">{item.name}</span>
                      <span className="text-xs font-bold shrink-0">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">No assets</div>
            )}
          </motion.div>
        </div>

        {/* Breakdown */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
          {/* Assets */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-income/10 shrink-0">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Assets</h3>
                <p className="text-xs text-muted-foreground truncate">{formatCurrency(totalAssets)} • {assets.length} accounts</p>
              </div>
            </div>
            {assets.length > 0 ? (
              <div className="space-y-3">
                {assets.map((account, index) => {
                  const Icon = accountIcons[account.type] || Wallet;
                  const percentage = totalAssets > 0 ? (Number(account.balance || 0) / totalAssets) * 100 : 0;
                  return (
                    <motion.div key={account.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + index * 0.05 }} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${account.color || '#10B981'}20` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: account.color || '#10B981' }} />
                          </div>
                          <span className="font-medium text-sm truncate">{account.name}</span>
                          <Badge variant="outline" className="text-[9px] capitalize shrink-0 hidden sm:inline-flex">{account.type.replace('_', ' ')}</Badge>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold text-sm">{formatCurrency(Number(account.balance || 0))}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ delay: 0.4 + index * 0.05, duration: 0.6 }} className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: account.color || '#10B981' }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Wallet className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No asset accounts</p>
              </div>
            )}
          </motion.div>

          {/* Liabilities */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-expense/10 shrink-0">
                <TrendingDown className="h-4 w-4 text-expense" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Liabilities</h3>
                <p className="text-xs text-muted-foreground truncate">{formatCurrency(totalLiabilities)} • {liabilities.length} accounts</p>
              </div>
            </div>
            {liabilities.length > 0 ? (
              <div className="space-y-3">
                {liabilities.map((account, index) => {
                  const percentage = totalLiabilities > 0 ? (Math.abs(Number(account.balance || 0)) / totalLiabilities) * 100 : 0;
                  return (
                    <motion.div key={account.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.05 }} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${account.color || '#EF4444'}20` }}>
                            <CreditCard className="h-3.5 w-3.5" style={{ color: account.color || '#EF4444' }} />
                          </div>
                          <span className="font-medium text-sm truncate">{account.name}</span>
                        </div>
                        <span className="font-semibold text-expense text-sm shrink-0">{formatCurrency(Math.abs(Number(account.balance || 0)))}</span>
                      </div>
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ delay: 0.45 + index * 0.05, duration: 0.6 }} className="absolute inset-y-0 left-0 rounded-full bg-expense" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-8 w-8 text-income mb-2" />
                <p className="font-medium text-sm">No liabilities!</p>
                <p className="text-xs text-muted-foreground">You're debt-free 🎉</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NetWorth;
