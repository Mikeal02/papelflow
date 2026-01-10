import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Lightbulb,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  category_id?: string | null;
  payee?: string | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface InsightData {
  type: 'positive' | 'warning' | 'neutral' | 'tip';
  icon: typeof TrendingUp;
  title: string;
  description: string;
  value?: string;
}

interface SmartInsightsProps {
  transactions: Transaction[];
  categories: Category[];
  formatCurrency: (amount: number, showSign?: boolean) => string;
}

export function SmartInsights({ transactions, categories, formatCurrency }: SmartInsightsProps) {
  const insights = useMemo(() => {
    const result: InsightData[] = [];
    const now = new Date();
    
    // Current month data
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1;
    const daysPassed = differenceInDays(now, currentMonthStart) + 1;
    
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
    
    // Previous month data
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });
    
    // Calculate spending
    const currentSpending = currentMonthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const prevSpending = prevMonthTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const currentIncome = currentMonthTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const prevIncome = prevMonthTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Projected spending (based on current pace)
    const projectedSpending = (currentSpending / daysPassed) * daysInMonth;
    
    // 1. Spending comparison
    if (prevSpending > 0) {
      const spendingDiff = ((currentSpending - prevSpending) / prevSpending) * 100;
      
      if (spendingDiff < -10) {
        result.push({
          type: 'positive',
          icon: TrendingDown,
          title: 'Great job cutting costs!',
          description: `You've spent ${Math.abs(spendingDiff).toFixed(0)}% less than last month so far.`,
          value: formatCurrency(Math.abs(currentSpending - prevSpending)),
        });
      } else if (spendingDiff > 20) {
        result.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'Spending is up',
          description: `You're spending ${spendingDiff.toFixed(0)}% more than last month. Review your expenses.`,
          value: formatCurrency(currentSpending - prevSpending),
        });
      }
    }
    
    // 2. Projected overspending
    if (projectedSpending > prevSpending * 1.15 && prevSpending > 0) {
      result.push({
        type: 'warning',
        icon: ArrowUpRight,
        title: 'On track to overspend',
        description: `At this pace, you'll spend ${formatCurrency(projectedSpending)} this month.`,
        value: formatCurrency(projectedSpending - prevSpending) + ' over',
      });
    }
    
    // 3. Income growth
    if (prevIncome > 0 && currentIncome > prevIncome) {
      const incomeGrowth = ((currentIncome - prevIncome) / prevIncome) * 100;
      if (incomeGrowth >= 5) {
        result.push({
          type: 'positive',
          icon: TrendingUp,
          title: 'Income increased!',
          description: `Your income is up ${incomeGrowth.toFixed(0)}% compared to last month.`,
          value: '+' + formatCurrency(currentIncome - prevIncome),
        });
      }
    }
    
    // 4. Category-specific insights
    const categorySpending: Record<string, { current: number; prev: number }> = {};
    
    currentMonthTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
      if (!categorySpending[t.category_id!]) {
        categorySpending[t.category_id!] = { current: 0, prev: 0 };
      }
      categorySpending[t.category_id!].current += Number(t.amount);
    });
    
    prevMonthTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
      if (!categorySpending[t.category_id!]) {
        categorySpending[t.category_id!] = { current: 0, prev: 0 };
      }
      categorySpending[t.category_id!].prev += Number(t.amount);
    });
    
    // Find biggest spending increase
    let biggestIncrease = { category: '', increase: 0, categoryName: '' };
    Object.entries(categorySpending).forEach(([catId, data]) => {
      if (data.prev > 0) {
        const increase = data.current - data.prev;
        if (increase > biggestIncrease.increase) {
          const cat = categories.find(c => c.id === catId);
          biggestIncrease = {
            category: catId,
            increase,
            categoryName: cat?.name || 'Unknown',
          };
        }
      }
    });
    
    if (biggestIncrease.increase > 50) {
      result.push({
        type: 'neutral',
        icon: Lightbulb,
        title: `${biggestIncrease.categoryName} spending up`,
        description: `This category increased by ${formatCurrency(biggestIncrease.increase)} from last month.`,
      });
    }
    
    // 5. Savings rate
    if (currentIncome > 0) {
      const savingsRate = ((currentIncome - currentSpending) / currentIncome) * 100;
      if (savingsRate >= 20) {
        result.push({
          type: 'positive',
          icon: Target,
          title: 'Solid savings rate!',
          description: `You're saving ${savingsRate.toFixed(0)}% of your income this month.`,
          value: formatCurrency(currentIncome - currentSpending),
        });
      } else if (savingsRate < 0) {
        result.push({
          type: 'warning',
          icon: ArrowDownRight,
          title: 'Spending exceeds income',
          description: "You're spending more than you're earning this month.",
          value: formatCurrency(currentSpending - currentIncome) + ' deficit',
        });
      }
    }
    
    // 6. Tips
    if (result.length < 3) {
      result.push({
        type: 'tip',
        icon: Sparkles,
        title: 'Pro tip',
        description: 'Set up budgets for your top spending categories to stay on track.',
      });
    }
    
    return result.slice(0, 4);
  }, [transactions, categories, formatCurrency]);

  if (insights.length === 0) {
    return null;
  }

  const getInsightStyles = (type: InsightData['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-income/10 border-income/20 text-income';
      case 'warning':
        return 'bg-expense/10 border-expense/20 text-expense';
      case 'tip':
        return 'bg-primary/10 border-primary/20 text-primary';
      default:
        return 'bg-muted/50 border-border text-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Smart Insights</h3>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'rounded-xl border p-4 transition-all hover:scale-[1.02]',
              getInsightStyles(insight.type)
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                insight.type === 'positive' && 'bg-income/20',
                insight.type === 'warning' && 'bg-expense/20',
                insight.type === 'tip' && 'bg-primary/20',
                insight.type === 'neutral' && 'bg-muted'
              )}>
                <insight.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground text-sm">{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {insight.description}
                </p>
                {insight.value && (
                  <p className="text-sm font-semibold mt-1">{insight.value}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
