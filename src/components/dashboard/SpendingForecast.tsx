import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTransactions } from '@/hooks/useTransactions';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';

interface ForecastData {
  day: string;
  actual?: number;
  projected?: number;
}

export function SpendingForecast() {
  const { data: transactions = [] } = useTransactions();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();

  const forecast = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const dayOfMonth = today.getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const currentMonthExpenses = transactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && txDate >= monthStart && txDate <= today;
    });

    const dailySpending: Record<number, number> = {};
    currentMonthExpenses.forEach(t => {
      const day = new Date(t.date).getDate();
      dailySpending[day] = (dailySpending[day] || 0) + Number(t.amount);
    });

    let cumulative = 0;
    const actualData: ForecastData[] = [];
    for (let day = 1; day <= dayOfMonth; day++) {
      cumulative += dailySpending[day] || 0;
      actualData.push({
        day: String(day),
        actual: cumulative,
      });
    }

    const past3MonthsExpenses: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const pastMonth = subMonths(today, i);
      const pastMonthStart = startOfMonth(pastMonth);
      const pastMonthEnd = endOfMonth(pastMonth);
      const pastDays = differenceInDays(pastMonthEnd, pastMonthStart) + 1;
      
      const monthTotal = transactions
        .filter(t => {
          const txDate = new Date(t.date);
          return t.type === 'expense' && txDate >= pastMonthStart && txDate <= pastMonthEnd;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      past3MonthsExpenses.push(monthTotal / pastDays);
    }

    const avgDailySpending = past3MonthsExpenses.length > 0
      ? past3MonthsExpenses.reduce((a, b) => a + b, 0) / past3MonthsExpenses.length
      : cumulative / dayOfMonth;

    const upcomingBills = subscriptions
      .filter(s => s.is_active)
      .filter(s => {
        const dueDate = new Date(s.next_due);
        return dueDate > today && dueDate <= monthEnd;
      })
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const projectedRemaining = (avgDailySpending * daysRemaining) + upcomingBills;
    const projectedTotal = cumulative + projectedRemaining;

    const projectionData: ForecastData[] = [];
    let projectedCumulative = cumulative;
    for (let day = dayOfMonth + 1; day <= daysInMonth; day++) {
      projectedCumulative += avgDailySpending;
      subscriptions
        .filter(s => s.is_active && new Date(s.next_due).getDate() === day)
        .forEach(s => {
          projectedCumulative += Number(s.amount);
        });
      projectionData.push({
        day: String(day),
        projected: projectedCumulative,
      });
    }

    const chartData = [...actualData, ...projectionData];

    const currentMonth = format(today, 'yyyy-MM');
    const totalBudget = budgets
      .filter(b => b.month === currentMonth)
      .reduce((sum, b) => sum + Number(b.amount), 0);

    const categorySpending: Record<string, number> = {};
    currentMonthExpenses.forEach(t => {
      if (t.category_id) {
        categorySpending[t.category_id] = (categorySpending[t.category_id] || 0) + Number(t.amount);
      }
    });

    const categoryForecasts = budgets
      .filter(b => b.month === currentMonth)
      .map(budget => {
        const category = categories.find(c => c.id === budget.category_id);
        const spent = categorySpending[budget.category_id] || 0;
        const dailyAvg = spent / dayOfMonth;
        const projectedSpend = spent + (dailyAvg * daysRemaining);
        const overBudget = projectedSpend > Number(budget.amount);
        
        return {
          id: budget.id,
          name: category?.name || 'Unknown',
          spent,
          budget: Number(budget.amount),
          projected: projectedSpend,
          overBudget,
          percentProjected: (projectedSpend / Number(budget.amount)) * 100,
        };
      })
      .sort((a, b) => b.percentProjected - a.percentProjected)
      .slice(0, 4);

    return {
      currentSpending: cumulative,
      projectedTotal,
      totalBudget,
      avgDailySpending,
      daysRemaining,
      upcomingBills,
      chartData,
      categoryForecasts,
      isOverBudget: projectedTotal > totalBudget && totalBudget > 0,
      percentOfBudget: totalBudget > 0 ? (projectedTotal / totalBudget) * 100 : 0,
    };
  }, [transactions, subscriptions, budgets, categories]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel rounded-xl p-3 shadow-lg border-border/50">
          <p className="text-xs text-muted-foreground font-medium">Day {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-bold mt-1" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
    >
      <Card className="stat-card group">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-warning/20 to-warning/10 group-hover:scale-110 transition-transform duration-300">
              <Zap className="h-4 w-4 text-warning" />
            </div>
            <span className="font-semibold">Spending Forecast</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30"
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Current</p>
              <p className="text-base sm:text-xl font-bold mt-0.5 truncate">
                {formatCurrency(forecast.currentSpending)}
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 }}
              className={cn(
                'p-3 rounded-xl border transition-all',
                forecast.isOverBudget 
                  ? 'bg-gradient-to-br from-expense/15 to-expense/5 border-expense/20' 
                  : 'bg-gradient-to-br from-income/15 to-income/5 border-income/20'
              )}
            >
              <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Projected</p>
              <p className={cn(
                'text-base sm:text-xl font-bold mt-0.5 truncate',
                forecast.isOverBudget ? 'text-expense' : 'text-income'
              )}>
                {formatCurrency(forecast.projectedTotal)}
              </p>
            </motion.div>
          </div>

          {/* Budget Progress */}
          {forecast.totalBudget > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">vs Budget</span>
                <span className={cn(
                  'font-bold',
                  forecast.percentOfBudget > 100 ? 'text-expense' : 'text-foreground'
                )}>
                  {Math.round(forecast.percentOfBudget)}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(forecast.percentOfBudget, 100)}%` }}
                  transition={{ delay: 0.55, duration: 0.8, ease: "easeOut" }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    forecast.percentOfBudget > 100 ? 'bg-gradient-to-r from-expense to-expense/80' : 'bg-gradient-to-r from-primary to-primary/80'
                  )}
                />
              </div>
              {forecast.isOverBudget && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs text-expense bg-expense/10 rounded-lg px-2 py-1.5"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">Over budget by {formatCurrency(forecast.projectedTotal - forecast.totalBudget)}</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Chart */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="h-[160px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.chartData}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} />
                {forecast.totalBudget > 0 && (
                  <ReferenceLine 
                    y={forecast.totalBudget} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#actualGradient)"
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Projected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Calendar, label: 'Days Left', value: forecast.daysRemaining, color: 'text-muted-foreground' },
              { icon: ArrowRight, label: 'Daily Avg', value: formatCurrency(forecast.avgDailySpending), color: 'text-foreground' },
              { icon: AlertTriangle, label: 'Bills Due', value: formatCurrency(forecast.upcomingBills), color: 'text-warning' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="p-2 rounded-xl bg-muted/30 text-center"
              >
                <item.icon className={cn('h-3 w-3 mx-auto mb-1', item.color)} />
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className={cn('text-xs font-bold truncate', item.color)}>{item.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Category Projections */}
          {forecast.categoryForecasts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-2 pt-3 border-t border-border/50"
            >
              <p className="text-xs font-semibold text-muted-foreground">Category Projections</p>
              <div className="space-y-2">
                {forecast.categoryForecasts.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.85 + index * 0.05 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{cat.name}</span>
                      <span className={cn(
                        'font-bold',
                        cat.overBudget ? 'text-expense' : 'text-foreground'
                      )}>
                        {Math.round(cat.percentProjected)}%
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(cat.percentProjected, 100)}%` }}
                        transition={{ delay: 0.9 + index * 0.05, duration: 0.6 }}
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full',
                          cat.overBudget ? 'bg-expense' : 'bg-primary'
                        )}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
