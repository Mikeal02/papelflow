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
import { Download, Calendar, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { getCategorySpending, getMonthlyStats } from '@/lib/mock-data';
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

const monthlyData = [
  { month: 'Aug', income: 5400, expenses: 3200 },
  { month: 'Sep', income: 5400, expenses: 3800 },
  { month: 'Oct', income: 6100, expenses: 3500 },
  { month: 'Nov', income: 5400, expenses: 4200 },
  { month: 'Dec', income: 6800, expenses: 5100 },
  { month: 'Jan', income: 6250, expenses: 2611 },
];

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(160, 84%, 39%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 60%)',
  'hsl(280, 65%, 60%)',
];

const Reports = () => {
  const categorySpending = getCategorySpending();
  const stats = getMonthlyStats();

  const pieData = categorySpending.map((item) => ({
    name: item.category.name,
    value: item.amount,
  }));

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
            <Select defaultValue="6months">
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
                <p className="text-2xl font-bold">$5,892</p>
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
                <p className="text-2xl font-bold">$3,735</p>
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
                <p className="text-2xl font-bold text-income">36.6%</p>
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
                      <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 72%, 60%)" stopOpacity={0} />
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
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="hsl(160, 84%, 39%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGradient)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="hsl(0, 72%, 60%)"
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(222, 47%, 13%)',
                      border: '1px solid hsl(222, 30%, 22%)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
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
          <div className="space-y-4">
            {[
              { name: 'Apartment Rent', amount: 1800, category: 'Housing' },
              { name: 'Amazon', amount: 234.5, category: 'Shopping' },
              { name: 'Whole Foods Market', amount: 156.32, category: 'Groceries' },
              { name: 'Electric Company', amount: 125, category: 'Utilities' },
              { name: 'The Italian Place', amount: 78.5, category: 'Dining' },
            ].map((merchant, index) => (
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
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Reports;
