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
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

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
    
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const daysInMonth = differenceInDays(currentMonthEnd, currentMonthStart) + 1;
    const daysPassed = differenceInDays(now, currentMonthStart) + 1;
    
    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= currentMonthStart && d <= currentMonthEnd;
    });
    
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });
    
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
    
    const projectedSpending = (currentSpending / daysPassed) * daysInMonth;
    
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
    
    if (projectedSpending > prevSpending * 1.15 && prevSpending > 0) {
      result.push({
        type: 'warning',
        icon: ArrowUpRight,
        title: 'On track to overspend',
        description: `At this pace, you'll spend ${formatCurrency(projectedSpending)} this month.`,
        value: formatCurrency(projectedSpending - prevSpending) + ' over',
      });
    }
    
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
        return {
          bg: 'from-income/15 to-income/5',
          border: 'border-income/20',
          iconBg: 'bg-income/20',
          iconColor: 'text-income',
        };
      case 'warning':
        return {
          bg: 'from-expense/15 to-expense/5',
          border: 'border-expense/20',
          iconBg: 'bg-expense/20',
          iconColor: 'text-expense',
        };
      case 'tip':
        return {
          bg: 'from-primary/15 to-primary/5',
          border: 'border-primary/20',
          iconBg: 'bg-primary/20',
          iconColor: 'text-primary',
        };
      default:
        return {
          bg: 'from-muted/50 to-muted/30',
          border: 'border-border/50',
          iconBg: 'bg-muted',
          iconColor: 'text-muted-foreground',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.5 }}
      className="stat-card"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-base">Smart Insights</h3>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, index) => {
          const styles = getInsightStyles(insight.type);
          
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className={cn(
                'rounded-xl border p-4 cursor-default transition-all duration-300',
                'bg-gradient-to-br hover:shadow-md',
                styles.bg,
                styles.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform',
                  styles.iconBg
                )}>
                  <insight.icon className={cn('h-5 w-5', styles.iconColor)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.value && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 + index * 0.08 }}
                      className={cn('text-sm font-bold mt-1.5', styles.iconColor)}
                    >
                      {insight.value}
                    </motion.p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
