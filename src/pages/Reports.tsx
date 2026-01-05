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
import { Download, Calendar, TrendingUp, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
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

const COLORS = [
  'hsl(185, 85%, 50%)',
  'hsl(160, 84%, 45%)',
  'hsl(280, 75%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
];

const Reports = () => {
  const [timeRange, setTimeRange] = useState('6months');
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  // Calculate monthly data based on time range
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

  // Calculate category spending for pie chart
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

  // Calculate averages
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

  // Top merchants (group by payee)
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

  const isLoading = transactionsLoading || categoriesLoading;

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
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analyze your financial trends
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-5 md:grid-cols-3"
        >
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-income/10">
                <TrendingUp className="h-6 w-6 text-income" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Income</p>
                <p className="text-2xl font-bold">${stats.avgIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-expense/10">
                <TrendingDown className="h-6 w-6 text-expense" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Expenses</p>
                <p className="text-2xl font-bold">${stats.avgExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Savings Rate</p>
                <p className={`text-2xl font-bold ${stats.savingsRate >= 0 ? 'text-income' : 'text-expense'}`}>
                  {stats.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Income vs Expenses Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <h3 className="text-lg font-semibold mb-6">Income vs Expenses</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 72%, 55%)" stopOpacity={0} />
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
                    labelStyle={{ color: 'hsl(210, 40%, 96%)' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(160, 84%, 45%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(0, 72%, 55%)"
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
                <span className="text-sm text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-expense" />
                <span className="text-sm text-muted-foreground">Expenses</span>
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
            <h3 className="text-lg font-semibold mb-6">Spending by Category</h3>
            {categorySpending.length > 0 ? (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySpending}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categorySpending.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 10%)',
                          border: '1px solid hsl(222, 30%, 18%)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {categorySpending.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <p className="text-muted-foreground">No expense data for this period</p>
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
          <h3 className="text-lg font-semibold mb-6">Top Merchants</h3>
          {topMerchants.length > 0 ? (
            <div className="space-y-4">
              {topMerchants.map((merchant, index) => (
                <motion.div
                  key={merchant.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{merchant.name}</p>
                    <p className="text-sm text-muted-foreground">{merchant.category}</p>
                  </div>
                  <span className="font-semibold tabular-nums">
                    ${merchant.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-muted-foreground">No expense data to show top merchants</p>
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Reports;
