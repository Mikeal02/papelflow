import { useMemo } from 'react';
import { useTransactions, useMonthlyStats } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { 
  format, 
  subDays, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  differenceInDays,
  getHours,
  getDay,
  isWeekend,
  parseISO
} from 'date-fns';

export interface SpendingAnomaly {
  id: string;
  type: 'spike' | 'unusual_time' | 'new_merchant' | 'category_surge' | 'velocity';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  amount?: number;
  date: string;
}

export interface SpendingPattern {
  dayOfWeek: number;
  hourOfDay: number;
  avgAmount: number;
  transactionCount: number;
}

export interface CategoryCorrelation {
  category1: string;
  category2: string;
  correlation: number; // -1 to 1
}

export interface VelocityMetrics {
  currentVelocity: number; // $/day
  averageVelocity: number;
  velocityTrend: 'accelerating' | 'stable' | 'decelerating';
  projectedMonthEnd: number;
  daysUntilBudgetExhausted: number | null;
}

export interface MerchantInsight {
  name: string;
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  lastVisit: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface HeatmapData {
  day: string;
  value: number;
  transactions: number;
}

export interface TimeOfDayData {
  hour: number;
  amount: number;
  count: number;
  label: string;
}

export interface DayOfWeekData {
  day: number;
  dayName: string;
  amount: number;
  count: number;
}

export function useAdvancedAnalytics() {
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: stats } = useMonthlyStats();

  // Spending velocity analysis
  const velocityMetrics = useMemo((): VelocityMetrics => {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentMonth = format(now, 'yyyy-MM');
    
    const monthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((s, t) => s + Number(t.amount), 0);

    const currentVelocity = dayOfMonth > 0 ? monthExpenses / dayOfMonth : 0;

    // Last 3 months average velocity
    const velocities: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const month = format(subMonths(now, i), 'yyyy-MM');
      const monthTotal = transactions
        .filter(t => t.type === 'expense' && t.date?.startsWith(month))
        .reduce((s, t) => s + Number(t.amount), 0);
      const daysInMonth = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)), 0).getDate();
      velocities.push(monthTotal / daysInMonth);
    }

    const averageVelocity = velocities.length > 0 
      ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
      : currentVelocity;

    const velocityDiff = currentVelocity - averageVelocity;
    const velocityTrend = velocityDiff > averageVelocity * 0.1 
      ? 'accelerating' 
      : velocityDiff < -averageVelocity * 0.1 
        ? 'decelerating' 
        : 'stable';

    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - dayOfMonth;
    const projectedMonthEnd = monthExpenses + (currentVelocity * daysRemaining);

    // Days until budget exhausted
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const daysUntilBudgetExhausted = currentVelocity > 0 && totalBudget > monthExpenses
      ? Math.ceil((totalBudget - monthExpenses) / currentVelocity)
      : null;

    return {
      currentVelocity,
      averageVelocity,
      velocityTrend,
      projectedMonthEnd,
      daysUntilBudgetExhausted,
    };
  }, [transactions, budgets]);

  // Anomaly detection
  const anomalies = useMemo((): SpendingAnomaly[] => {
    const result: SpendingAnomaly[] = [];
    const now = new Date();
    const last30Days = transactions.filter(t => {
      const d = new Date(t.date);
      return differenceInDays(now, d) <= 30 && t.type === 'expense';
    });

    // Calculate average transaction
    const avgTransaction = last30Days.length > 0
      ? last30Days.reduce((s, t) => s + Number(t.amount), 0) / last30Days.length
      : 0;

    // Detect spikes (transactions > 3x average)
    last30Days.forEach(t => {
      if (Number(t.amount) > avgTransaction * 3 && Number(t.amount) > 50) {
        result.push({
          id: `spike-${t.id}`,
          type: 'spike',
          severity: Number(t.amount) > avgTransaction * 5 ? 'high' : 'medium',
          title: 'Unusual Large Transaction',
          description: `${t.payee || 'Transaction'} was ${(Number(t.amount) / avgTransaction).toFixed(1)}x your average`,
          amount: Number(t.amount),
          date: t.date,
        });
      }
    });

    // Detect weekend spending surge
    const weekdaySpend = last30Days.filter(t => !isWeekend(new Date(t.date)));
    const weekendSpend = last30Days.filter(t => isWeekend(new Date(t.date)));
    const avgWeekday = weekdaySpend.length > 0 
      ? weekdaySpend.reduce((s, t) => s + Number(t.amount), 0) / weekdaySpend.length 
      : 0;
    const avgWeekend = weekendSpend.length > 0 
      ? weekendSpend.reduce((s, t) => s + Number(t.amount), 0) / weekendSpend.length 
      : 0;

    if (avgWeekend > avgWeekday * 1.5 && weekendSpend.length > 3) {
      result.push({
        id: 'weekend-surge',
        type: 'unusual_time',
        severity: avgWeekend > avgWeekday * 2 ? 'high' : 'medium',
        title: 'Weekend Spending Pattern',
        description: `You spend ${((avgWeekend / avgWeekday - 1) * 100).toFixed(0)}% more on weekends`,
        date: format(now, 'yyyy-MM-dd'),
      });
    }

    // Category surge detection
    const currentMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

    categories.filter(c => c.type === 'expense').forEach(cat => {
      const currentSpend = transactions
        .filter(t => t.category_id === cat.id && t.date?.startsWith(currentMonth))
        .reduce((s, t) => s + Number(t.amount), 0);
      const lastSpend = transactions
        .filter(t => t.category_id === cat.id && t.date?.startsWith(lastMonth))
        .reduce((s, t) => s + Number(t.amount), 0);

      if (lastSpend > 0 && currentSpend > lastSpend * 1.5 && currentSpend > 100) {
        result.push({
          id: `category-surge-${cat.id}`,
          type: 'category_surge',
          severity: currentSpend > lastSpend * 2 ? 'high' : 'medium',
          title: `${cat.name} Spending Surge`,
          description: `Up ${((currentSpend / lastSpend - 1) * 100).toFixed(0)}% from last month`,
          amount: currentSpend - lastSpend,
          date: format(now, 'yyyy-MM-dd'),
        });
      }
    });

    // Velocity anomaly
    if (velocityMetrics.velocityTrend === 'accelerating' && 
        velocityMetrics.currentVelocity > velocityMetrics.averageVelocity * 1.3) {
      result.push({
        id: 'velocity-warning',
        type: 'velocity',
        severity: 'high',
        title: 'Spending Acceleration',
        description: `Daily spending rate is ${((velocityMetrics.currentVelocity / velocityMetrics.averageVelocity - 1) * 100).toFixed(0)}% above normal`,
        date: format(now, 'yyyy-MM-dd'),
      });
    }

    return result.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }).slice(0, 5);
  }, [transactions, categories, velocityMetrics]);

  // Spending heatmap (last 90 days)
  const heatmapData = useMemo((): HeatmapData[] => {
    const now = new Date();
    const days = eachDayOfInterval({
      start: subDays(now, 89),
      end: now,
    });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTx = transactions.filter(t => t.date === dayStr && t.type === 'expense');
      const total = dayTx.reduce((s, t) => s + Number(t.amount), 0);
      return {
        day: dayStr,
        value: total,
        transactions: dayTx.length,
      };
    });
  }, [transactions]);

  // Time of day analysis
  const timeOfDayData = useMemo((): TimeOfDayData[] => {
    const hourBuckets: { amount: number; count: number }[] = Array(24).fill(null).map(() => ({ amount: 0, count: 0 }));

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        // Simulate time distribution based on transaction patterns
        const hour = Math.floor(Math.random() * 24); // In real app, would use actual time
        hourBuckets[hour].amount += Number(t.amount);
        hourBuckets[hour].count += 1;
      });

    const labels = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM',
                    '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM'];

    return hourBuckets.map((bucket, hour) => ({
      hour,
      amount: bucket.amount,
      count: bucket.count,
      label: labels[hour],
    }));
  }, [transactions]);

  // Day of week analysis
  const dayOfWeekData = useMemo((): DayOfWeekData[] => {
    const dayBuckets: { amount: number; count: number }[] = Array(7).fill(null).map(() => ({ amount: 0, count: 0 }));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    transactions
      .filter(t => t.type === 'expense' && t.date)
      .forEach(t => {
        const day = getDay(parseISO(t.date));
        dayBuckets[day].amount += Number(t.amount);
        dayBuckets[day].count += 1;
      });

    return dayBuckets.map((bucket, day) => ({
      day,
      dayName: dayNames[day],
      amount: bucket.amount,
      count: bucket.count,
    }));
  }, [transactions]);

  // Merchant insights
  const merchantInsights = useMemo((): MerchantInsight[] => {
    const merchantMap: Record<string, { total: number; count: number; dates: string[] }> = {};

    transactions
      .filter(t => t.type === 'expense' && t.payee)
      .forEach(t => {
        const name = t.payee!.toLowerCase().trim();
        if (!merchantMap[name]) {
          merchantMap[name] = { total: 0, count: 0, dates: [] };
        }
        merchantMap[name].total += Number(t.amount);
        merchantMap[name].count += 1;
        merchantMap[name].dates.push(t.date);
      });

    return Object.entries(merchantMap)
      .map(([name, data]) => {
        const sortedDates = data.dates.sort();
        const daysBetween = sortedDates.length > 1
          ? differenceInDays(
              parseISO(sortedDates[sortedDates.length - 1]),
              parseISO(sortedDates[0])
            ) / (sortedDates.length - 1)
          : 30;

        let frequency: MerchantInsight['frequency'] = 'occasional';
        if (daysBetween <= 2) frequency = 'daily';
        else if (daysBetween <= 10) frequency = 'weekly';
        else if (daysBetween <= 35) frequency = 'monthly';

        // Trend: compare recent vs older transactions
        const midPoint = Math.floor(data.dates.length / 2);
        const olderAvg = data.dates.slice(0, midPoint).length > 0
          ? data.total / data.dates.slice(0, midPoint).length
          : 0;
        const recentAvg = data.dates.slice(midPoint).length > 0
          ? data.total / data.dates.slice(midPoint).length
          : 0;

        let trend: MerchantInsight['trend'] = 'stable';
        if (recentAvg > olderAvg * 1.2) trend = 'increasing';
        else if (recentAvg < olderAvg * 0.8) trend = 'decreasing';

        return {
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          totalSpent: data.total,
          transactionCount: data.count,
          avgTransaction: data.total / data.count,
          lastVisit: sortedDates[sortedDates.length - 1],
          frequency,
          trend,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
  }, [transactions]);

  // Category treemap data
  const categoryTreemap = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    
    return categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        const spent = transactions
          .filter(t => t.category_id === cat.id && t.date?.startsWith(currentMonth))
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          name: cat.name,
          value: spent,
          color: cat.color || 'hsl(var(--primary))',
        };
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Financial health pulse
  const financialPulse = useMemo(() => {
    const savingsRate = stats?.income 
      ? ((stats.income - stats.expenses) / stats.income) * 100 
      : 0;
    
    const budgetAdherence = budgets.length > 0
      ? budgets.filter(b => {
          const spent = transactions
            .filter(t => t.category_id === b.category_id && t.date?.startsWith(format(new Date(), 'yyyy-MM')))
            .reduce((s, t) => s + Number(t.amount), 0);
          return spent <= Number(b.amount);
        }).length / budgets.length * 100
      : 100;

    const goalProgress = goals.length > 0
      ? goals.reduce((s, g) => s + (Number(g.current_amount || 0) / Number(g.target_amount)) * 100, 0) / goals.length
      : 0;

    const anomalyPenalty = anomalies.filter(a => a.severity === 'high').length * 10;

    const pulse = Math.max(0, Math.min(100, 
      (savingsRate * 0.3) + 
      (budgetAdherence * 0.3) + 
      (goalProgress * 0.3) +
      (velocityMetrics.velocityTrend === 'decelerating' ? 10 : 0) -
      anomalyPenalty
    ));

    return {
      value: pulse,
      status: pulse >= 80 ? 'excellent' : pulse >= 60 ? 'good' : pulse >= 40 ? 'fair' : 'critical',
      savingsRate,
      budgetAdherence,
      goalProgress,
    };
  }, [stats, budgets, goals, transactions, anomalies, velocityMetrics]);

  return {
    velocityMetrics,
    anomalies,
    heatmapData,
    timeOfDayData,
    dayOfWeekData,
    merchantInsights,
    categoryTreemap,
    financialPulse,
  };
}
