import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Calendar, TrendingUp, TrendingDown, ArrowRight, Loader2, BarChart3 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { exportReportToCSV } from '@/lib/export-utils';
import { toast } from '@/hooks/use-toast';
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
import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(215, 85%, 55%)',
  'hsl(155, 70%, 45%)',
  'hsl(170, 75%, 45%)',
  'hsl(40, 95%, 50%)',
  'hsl(0, 78%, 58%)',
];

const Reports = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { formatCurrency } = useCurrency();

  const monthlyData = useMemo(() => {
    const months = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '1year' ? 12 : 6;
    const result = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      result.push({
        month: format(date, 'MMM'),
        income,
        expenses,
      });
    }

    return result;
  }, [transactions, timeRange]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && txDate >= monthStart && txDate <= monthEnd;
      })
      .forEach(t => {
        if (t.category_id) {
          spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
        }
      });

    return Object.entries(spending)
      .map(([categoryId, amount]) => {
        const category = categories.find(c => c.id === categoryId);
        return {
          name: category?.name || 'Unknown',
          value: amount,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions, categories]);

  const stats = useMemo(() => {
    const monthCount = monthlyData.length || 1;
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);

    return {
      avgIncome: totalIncome / monthCount,
      avgExpenses: totalExpenses / monthCount,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    };
  }, [monthlyData]);

  const topMerchants = useMemo(() => {
    const merchantSpending: Record<string, { amount: number; category: string }> = {};
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && txDate >= monthStart && txDate <= monthEnd && t.payee;
      })
      .forEach(t => {
        const payee = t.payee || 'Unknown';
        const category = categories.find(c => c.id === t.category_id);
        if (!merchantSpending[payee]) {
          merchantSpending[payee] = { amount: 0, category: category?.name || 'Uncategorized' };
        }
        merchantSpending[payee].amount += Number(t.amount);
      });

    return Object.entries(merchantSpending)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, categories]);

  const handleExport = () => {
    if (monthlyData.length === 0) {
      toast({
        title: 'No data to export',
        description: 'Add some transactions first',
        variant: 'destructive',
      });
      return;
    }
    exportReportToCSV(monthlyData, categorySpending, topMerchants);
    toast({
      title: 'Report exported!',
      description: 'Your financial report has been downloaded',
    });
  };

  const isLoading = transactionsLoading || categoriesLoading;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
          <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground animate-pulse">Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Analyze your financial trends</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-muted/30 border-border/50">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { icon: TrendingUp, label: 'Average Income', value: formatCurrency(stats.avgIncome), color: 'income', bg: 'from-income/20 to-income/10' },
            { icon: TrendingDown, label: 'Average Expenses', value: formatCurrency(stats.avgExpenses), color: 'expense', bg: 'from-expense/20 to-expense/10' },
            { icon: ArrowRight, label: 'Avg. Savings Rate', value: `${stats.savingsRate.toFixed(1)}%`, color: stats.savingsRate >= 0 ? 'income' : 'expense', bg: 'from-primary/20 to-primary/10' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className="stat-card"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br',
                  item.bg
                )}>
                  <item.icon className={cn('h-5 w-5', `text-${item.color}`)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                  <p className={cn('text-xl font-bold', `text-${item.color}`)}>{item.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Income vs Expenses Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold">Income vs Expenses</h3>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--income))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--income))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--expense))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--expense))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    width={40}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(var(--income))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(var(--expense))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGradient)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-income" />
                <span className="text-xs text-muted-foreground font-medium">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-expense" />
                <span className="text-xs text-muted-foreground font-medium">Expenses</span>
              </div>
            </div>
          </motion.div>

          {/* Spending by Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="stat-card"
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                <BarChart3 className="h-4 w-4 text-accent" />
              </div>
              <h3 className="font-semibold">Spending by Category</h3>
            </div>
            {categorySpending.length > 0 ? (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpending}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {categorySpending.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {categorySpending.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <p className="text-sm text-muted-foreground">No expense data for this period</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Top Merchants */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10">
              <TrendingUp className="h-4 w-4 text-warning" />
            </div>
            <h3 className="font-semibold">Top Merchants</h3>
          </div>
          {topMerchants.length > 0 ? (
            <div className="space-y-3">
              {topMerchants.map((merchant, index) => (
                <motion.div
                  key={merchant.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-default"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/60 text-sm font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{merchant.name}</p>
                    <p className="text-xs text-muted-foreground">{merchant.category}</p>
                  </div>
                  <span className="font-bold tabular-nums">{formatCurrency(merchant.amount)}</span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No expense data to show top merchants</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Reports;
