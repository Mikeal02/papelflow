import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts } from '@/hooks/useAccounts';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { ProgressRing, MultiProgressRing } from '@/components/ui/progress-ring';
import { GlowingBorder, GradientBadge } from '@/components/ui/glowing-border';
import { cn } from '@/lib/utils';

interface HealthMetric {
  name: string;
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  tip: string;
  color: string;
}

export const FinancialHealthScore = () => {
  const { data: accounts = [] } = useAccounts();
  const { data: stats } = useMonthlyStats();
  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();

  const { overallScore, metrics, rating, ratingColor, segments } = useMemo(() => {
    const metricsList: HealthMetric[] = [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth))
      .reduce((acc, t) => {
        if (t.category_id) {
          acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
        }
        return acc;
      }, {} as Record<string, number>);

    // 1. Savings Rate (0-30 points)
    const savingsRate = stats?.income ? ((stats.income - stats.expenses) / stats.income) * 100 : 0;
    let savingsScore = 0;
    let savingsStatus: HealthMetric['status'] = 'poor';
    let savingsTip = 'Try to save at least 20% of your income';

    if (savingsRate >= 30) {
      savingsScore = 30;
      savingsStatus = 'excellent';
      savingsTip = 'Excellent savings rate! Keep it up';
    } else if (savingsRate >= 20) {
      savingsScore = 25;
      savingsStatus = 'good';
      savingsTip = 'Great job! You\'re on track';
    } else if (savingsRate >= 10) {
      savingsScore = 15;
      savingsStatus = 'warning';
      savingsTip = 'Try to increase savings to 20%';
    } else if (savingsRate > 0) {
      savingsScore = 10;
      savingsStatus = 'warning';
      savingsTip = 'Look for ways to reduce expenses';
    }

    metricsList.push({
      name: 'Savings Rate',
      score: savingsScore,
      maxScore: 30,
      status: savingsStatus,
      tip: savingsTip,
      color: 'hsl(var(--income))',
    });

    // 2. Budget Adherence (0-25 points)
    const budgetsWithSpending = budgets.filter(b => Number(b.amount) > 0);
    const onBudgetCount = budgetsWithSpending.filter(b => {
      const spent = monthlyExpenses[b.category_id] || 0;
      return spent <= Number(b.amount);
    }).length;
    const budgetAdherence = budgetsWithSpending.length > 0 
      ? (onBudgetCount / budgetsWithSpending.length) * 100 
      : 100;
    
    let budgetScore = budgetsWithSpending.length === 0 ? 10 : Math.round((budgetAdherence / 100) * 25);
    let budgetStatus: HealthMetric['status'] = budgetAdherence >= 90 ? 'excellent' : budgetAdherence >= 75 ? 'good' : budgetAdherence >= 50 ? 'warning' : 'poor';

    metricsList.push({
      name: 'Budget Control',
      score: budgetScore,
      maxScore: 25,
      status: budgetStatus,
      tip: budgetStatus === 'excellent' ? 'Perfect budget management!' : 'Review overspent categories',
      color: 'hsl(var(--primary))',
    });

    // 3. Goal Progress (0-25 points)
    const goalsWithProgress = goals.filter(g => Number(g.target_amount) > 0);
    const avgGoalProgress = goalsWithProgress.length > 0
      ? goalsWithProgress.reduce((sum, g) => 
          sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0
        ) / goalsWithProgress.length
      : 0;

    let goalScore = goalsWithProgress.length === 0 ? 10 : Math.round((avgGoalProgress / 100) * 25);
    let goalStatus: HealthMetric['status'] = avgGoalProgress >= 75 ? 'excellent' : avgGoalProgress >= 50 ? 'good' : avgGoalProgress >= 25 ? 'warning' : 'poor';

    metricsList.push({
      name: 'Goal Progress',
      score: goalScore,
      maxScore: 25,
      status: goalStatus,
      tip: goalStatus === 'excellent' ? 'Almost there! Keep pushing' : 'Stay consistent with contributions',
      color: 'hsl(var(--accent))',
    });

    // 4. Account Diversity (0-20 points)
    const accountTypes = new Set(accounts.map(a => a.type));
    let diversityScore = Math.min(accountTypes.size * 5, 20);
    let diversityStatus: HealthMetric['status'] = diversityScore >= 15 ? 'excellent' : diversityScore >= 10 ? 'good' : 'warning';

    metricsList.push({
      name: 'Account Diversity',
      score: diversityScore,
      maxScore: 20,
      status: diversityStatus,
      tip: diversityStatus === 'excellent' ? 'Well-diversified accounts' : 'Consider investment accounts',
      color: 'hsl(var(--chart-4))',
    });

    const total = metricsList.reduce((s, m) => s + m.score, 0);
    
    let ratingText = 'Needs Attention';
    let color = 'text-destructive';
    
    if (total >= 85) {
      ratingText = 'Excellent';
      color = 'text-income';
    } else if (total >= 70) {
      ratingText = 'Good';
      color = 'text-chart-1';
    } else if (total >= 50) {
      ratingText = 'Fair';
      color = 'text-chart-4';
    } else if (total >= 30) {
      ratingText = 'Needs Work';
      color = 'text-chart-5';
    }

    // Segments for multi-progress ring
    const segmentsData = metricsList.map(m => ({
      value: (m.score / 100) * 100,
      color: m.color,
    }));

    return {
      overallScore: total,
      metrics: metricsList,
      rating: ratingText,
      ratingColor: color,
      segments: segmentsData,
    };
  }, [accounts, stats, budgets, goals, transactions]);

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4 text-income" />;
      case 'good': return <TrendingUp className="h-4 w-4 text-chart-1" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-chart-4" />;
      case 'poor': return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <GlowingBorder glowColor={overallScore >= 70 ? 'income' : overallScore >= 50 ? 'primary' : 'expense'} intensity="low">
        <Card className="border-0 bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Financial Health
              </CardTitle>
              <GradientBadge variant={overallScore >= 70 ? 'success' : overallScore >= 50 ? 'primary' : 'warning'}>
                <Sparkles className="h-3 w-3" />
                {rating}
              </GradientBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Ring with segments */}
            <div className="flex items-center gap-4">
              <MultiProgressRing segments={segments} size={72} strokeWidth={8}>
                <motion.span
                  className={cn('text-xl font-bold', ratingColor)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  {overallScore}
                </motion.span>
              </MultiProgressRing>
              <div className="flex-1">
                <p className={cn('text-lg font-bold', ratingColor)}>{rating}</p>
                <p className="text-xs text-muted-foreground">
                  {overallScore >= 70 ? "You're doing great!" : "Room for improvement"}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              {metrics.map((metric, i) => (
                <motion.div
                  key={metric.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  {getStatusIcon(metric.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{metric.name}</span>
                      <span className="text-xs text-muted-foreground">{metric.score}/{metric.maxScore}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: metric.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowingBorder>
    </motion.div>
  );
};
