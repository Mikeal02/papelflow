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
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Download, Calendar, TrendingUp, TrendingDown, ArrowRight, Loader2, BarChart3, PieChart as PieChartIcon, Activity, DollarSign } from 'lucide-react';
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
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const COLORS = [
  'hsl(215, 85%, 55%)', 'hsl(155, 70%, 45%)', 'hsl(170, 75%, 45%)',
  'hsl(40, 95%, 50%)', 'hsl(0, 78%, 58%)', 'hsl(280, 70%, 55%)',
  'hsl(330, 80%, 55%)', 'hsl(195, 85%, 45%)',
];

const Reports = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const [activeTab, setActiveTab] = useState('overview');
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { formatCurrency } = useCurrency();

  const months = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '1year' ? 12 : 6;

  const monthlyData = useMemo(() => {
    const result = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      result.push({
        month: format(date, 'MMM'),
        fullMonth: format(date, 'MMM yyyy'),
        income,
        expenses,
        net: income - expenses,
        savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
        txCount: monthTx.length,
      });
    }
    return result;
  }, [transactions, months]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, number> = {};
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d >= monthStart && d <= monthEnd;
      })
      .forEach(t => {
        if (t.category_id) spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
      });
    return Object.entries(spending)
      .map(([id, amount]) => {
        const cat = categories.find(c => c.id === id);
        return { name: cat?.name || 'Unknown', value: amount };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, categories]);

  const incomeByCategory = useMemo(() => {
    const income: Record<string, number> = {};
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'income' && d >= monthStart && d <= monthEnd;
      })
      .forEach(t => {
        if (t.category_id) income[t.category_id] = (income[t.category_id] || 0) + Number(t.amount);
      });
    return Object.entries(income)
      .map(([id, amount]) => {
        const cat = categories.find(c => c.id === id);
        return { name: cat?.name || 'Unknown', value: amount };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  const dailySpending = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });
    const map: Record<string, number> = {};
    transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d >= start && d <= end;
    }).forEach(t => {
      map[t.date] = (map[t.date] || 0) + Number(t.amount);
    });
    return days.map(d => ({
      day: format(d, 'd'),
      amount: map[format(d, 'yyyy-MM-dd')] || 0,
    }));
  }, [transactions]);

  const stats = useMemo(() => {
    const count = monthlyData.length || 1;
    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
    const highestExpMonth = monthlyData.reduce((max, m) => m.expenses > max.expenses ? m : max, monthlyData[0] || { expenses: 0, fullMonth: '' });
    return {
      avgIncome: totalIncome / count,
      avgExpenses: totalExpenses / count,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      totalIncome,
      totalExpenses,
      highestExpMonth: highestExpMonth?.fullMonth || 'N/A',
      highestExpAmount: highestExpMonth?.expenses || 0,
    };
  }, [monthlyData]);

  const topMerchants = useMemo(() => {
    const merchantSpending: Record<string, { amount: number; category: string; count: number }> = {};
    transactions.filter(t => t.type === 'expense' && t.payee).forEach(t => {
      const payee = t.payee!;
      const cat = categories.find(c => c.id === t.category_id);
      if (!merchantSpending[payee]) merchantSpending[payee] = { amount: 0, category: cat?.name || 'Uncategorized', count: 0 };
      merchantSpending[payee].amount += Number(t.amount);
      merchantSpending[payee].count++;
    });
    return Object.entries(merchantSpending)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [transactions, categories]);

  const handleExport = () => {
    if (monthlyData.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    exportReportToCSV(monthlyData, categorySpending, topMerchants);
    toast({ title: 'Report exported!' });
  };

  const isLoading = transactionsLoading || categoriesLoading;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
        <p className="text-xs text-muted-foreground font-semibold mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name !== 'Savings Rate' ? formatCurrency(entry.value) : `${entry.value?.toFixed(1)}%`}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading reports...</p>
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
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Deep insights into your finances</p>
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
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingUp, label: 'Total Income', value: formatCurrency(stats.totalIncome), color: 'income' },
            { icon: TrendingDown, label: 'Total Expenses', value: formatCurrency(stats.totalExpenses), color: 'expense' },
            { icon: ArrowRight, label: 'Savings Rate', value: `${stats.savingsRate.toFixed(1)}%`, color: stats.savingsRate >= 0 ? 'income' : 'expense' },
            { icon: DollarSign, label: 'Highest Month', value: formatCurrency(stats.highestExpAmount), color: 'warning' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              className="stat-card p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-${item.color}/10`}>
                  <item.icon className={`h-4 w-4 text-${item.color}`} />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
              </div>
              <p className={`text-lg font-bold text-${item.color}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5">
              <PieChartIcon className="h-3.5 w-3.5" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="merchants" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Merchants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            {/* Income vs Expenses */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
              <h3 className="font-semibold mb-4">Income vs Expenses</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={45} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Net Cash Flow */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
              <h3 className="font-semibold mb-4">Net Cash Flow</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={45} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#netGrad)" name="Net" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Expense Breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
                <h3 className="font-semibold mb-4">Expense Breakdown</h3>
                {categorySpending.length > 0 ? (
                  <>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categorySpending} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {categorySpending.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                      {categorySpending.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs flex-1 truncate">{item.name}</span>
                          <span className="text-xs font-bold">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
                )}
              </motion.div>

              {/* Income Breakdown */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="stat-card">
                <h3 className="font-semibold mb-4">Income Sources</h3>
                {incomeByCategory.length > 0 ? (
                  <>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={incomeByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                      {incomeByCategory.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                          <span className="text-xs flex-1 truncate">{item.name}</span>
                          <span className="text-xs font-bold">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
                )}
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-5">
            {/* Savings Rate Trend */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
              <h3 className="font-semibold mb-4">Savings Rate Trend</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v}%`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="savingsRate" stroke="hsl(var(--income))" strokeWidth={2.5} dot={{ fill: 'hsl(var(--income))', r: 4 }} name="Savings Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Daily Spending This Month */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
              <h3 className="font-semibold mb-4">Daily Spending (This Month)</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />
                    <XAxis dataKey="day" fontSize={9} tickLine={false} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={10} tickLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `$${v}`} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill="hsl(var(--expense))" radius={[2, 2, 0, 0]} name="Spending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Monthly Summary Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="stat-card overflow-x-auto">
              <h3 className="font-semibold mb-4">Monthly Summary</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Month</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Income</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Expenses</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Net</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Rate</th>
                    <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map(m => (
                    <tr key={m.fullMonth} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-medium">{m.fullMonth}</td>
                      <td className="py-2.5 px-3 text-right text-income font-medium">{formatCurrency(m.income)}</td>
                      <td className="py-2.5 px-3 text-right text-expense font-medium">{formatCurrency(m.expenses)}</td>
                      <td className={cn('py-2.5 px-3 text-right font-bold', m.net >= 0 ? 'text-income' : 'text-expense')}>
                        {formatCurrency(m.net)}
                      </td>
                      <td className={cn('py-2.5 px-3 text-right', m.savingsRate >= 0 ? 'text-income' : 'text-expense')}>
                        {m.savingsRate.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{m.txCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </TabsContent>

          <TabsContent value="merchants" className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
              <h3 className="font-semibold mb-4">Top Merchants</h3>
              {topMerchants.length > 0 ? (
                <div className="space-y-3">
                  {topMerchants.map((merchant, i) => {
                    const maxAmount = topMerchants[0]?.amount || 1;
                    return (
                      <div key={merchant.name} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-xs font-bold">{i + 1}</span>
                            <div>
                              <p className="font-semibold text-sm">{merchant.name}</p>
                              <p className="text-[10px] text-muted-foreground">{merchant.category} • {merchant.count} transactions</p>
                            </div>
                          </div>
                          <span className="font-bold text-sm">{formatCurrency(merchant.amount)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden ml-11">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(merchant.amount / maxAmount) * 100}%` }}
                            transition={{ delay: 0.2 + i * 0.05, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No merchant data available</div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
