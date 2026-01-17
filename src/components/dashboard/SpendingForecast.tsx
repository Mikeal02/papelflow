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
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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

    // Get current month expenses
    const currentMonthExpenses = transactions.filter(t => {
      const txDate = new Date(t.date);
      return t.type === 'expense' && txDate >= monthStart && txDate <= today;
    });

    // Calculate daily spending for current month
    const dailySpending: Record<number, number> = {};
    currentMonthExpenses.forEach(t => {
      const day = new Date(t.date).getDate();
      dailySpending[day] = (dailySpending[day] || 0) + Number(t.amount);
    });

    // Calculate cumulative spending
    let cumulative = 0;
    const actualData: ForecastData[] = [];
    for (let day = 1; day <= dayOfMonth; day++) {
      cumulative += dailySpending[day] || 0;
      actualData.push({
        day: String(day),
        actual: cumulative,
      });
    }

    // Get last 3 months average daily spending
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

    // Get upcoming bills
    const upcomingBills = subscriptions
      .filter(s => s.is_active)
      .filter(s => {
        const dueDate = new Date(s.next_due);
        return dueDate > today && dueDate <= monthEnd;
      })
      .reduce((sum, s) => sum + Number(s.amount), 0);

    // Calculate projected spending for rest of month
    const projectedRemaining = (avgDailySpending * daysRemaining) + upcomingBills;
    const projectedTotal = cumulative + projectedRemaining;

    // Create projection data
    const projectionData: ForecastData[] = [];
    let projectedCumulative = cumulative;
    for (let day = dayOfMonth + 1; day <= daysInMonth; day++) {
      projectedCumulative += avgDailySpending;
      // Add bill spikes on specific days if applicable
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

    // Combine actual and projected data
    const chartData = [...actualData, ...projectionData];

    // Get total budget for the month
    const currentMonth = format(today, 'yyyy-MM');
    const totalBudget = budgets
      .filter(b => b.month === currentMonth)
      .reduce((sum, b) => sum + Number(b.amount), 0);

    // Calculate category forecasts
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
        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs text-muted-foreground">Day {label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
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
      transition={{ delay: 0.35 }}
    >
      <Card className="stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            <span>Spending Forecast</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-[10px] sm:text-xs text-muted-foreground">Current Spending</p>
              <p className="text-sm sm:text-lg font-bold truncate" title={formatCurrency(forecast.currentSpending)}>
                {formatCurrency(forecast.currentSpending)}
              </p>
            </div>
            <div className={cn(
              'p-3 rounded-lg',
              forecast.isOverBudget ? 'bg-expense/10' : 'bg-income/10'
            )}>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Projected Total</p>
              <p className={cn(
                'text-sm sm:text-lg font-bold truncate',
                forecast.isOverBudget ? 'text-expense' : 'text-income'
              )} title={formatCurrency(forecast.projectedTotal)}>
                {formatCurrency(forecast.projectedTotal)}
              </p>
            </div>
          </div>

          {/* Budget Progress */}
          {forecast.totalBudget > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">vs Budget</span>
                <span className={cn(
                  'font-medium',
                  forecast.percentOfBudget > 100 ? 'text-expense' : 'text-foreground'
                )}>
                  {Math.round(forecast.percentOfBudget)}% of {formatCurrency(forecast.totalBudget)}
                </span>
              </div>
              <Progress 
                value={Math.min(forecast.percentOfBudget, 100)} 
                className={cn('h-2', forecast.percentOfBudget > 100 && '[&>div]:bg-expense')}
              />
              {forecast.isOverBudget && (
                <div className="flex items-center gap-1 text-xs text-expense">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Projected to exceed budget by {formatCurrency(forecast.projectedTotal - forecast.totalBudget)}</span>
                </div>
              )}
            </div>
          )}

          {/* Spending Chart */}
          <div className="h-[140px] sm:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.chartData}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
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
                    label={{ value: 'Budget', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
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
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/20">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">Days Left</p>
              <p className="text-xs sm:text-sm font-semibold">{forecast.daysRemaining}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/20">
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-[10px] text-muted-foreground">Daily Avg</p>
              <p className="text-xs sm:text-sm font-semibold truncate" title={formatCurrency(forecast.avgDailySpending)}>
                {formatCurrency(forecast.avgDailySpending)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mx-auto text-warning mb-1" />
              <p className="text-[10px] text-muted-foreground">Bills Due</p>
              <p className="text-xs sm:text-sm font-semibold text-warning truncate" title={formatCurrency(forecast.upcomingBills)}>
                {formatCurrency(forecast.upcomingBills)}
              </p>
            </div>
          </div>

          {/* Category Forecasts */}
          {forecast.categoryForecasts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Category Projections</p>
              <div className="space-y-2">
                {forecast.categoryForecasts.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="truncate flex-1">{cat.name}</span>
                      <span className={cn(
                        'font-medium ml-2',
                        cat.overBudget ? 'text-expense' : 'text-foreground'
                      )}>
                        {Math.round(cat.percentProjected)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(cat.percentProjected, 100)} 
                      className={cn('h-1', cat.overBudget && '[&>div]:bg-expense')}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
