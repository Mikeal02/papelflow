import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAccounts } from '@/hooks/useAccounts';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';

interface HealthMetric {
  name: string;
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'poor';
  tip: string;
}

export const FinancialHealthScore = () => {
  const { data: accounts = [] } = useAccounts();
  const { data: stats } = useMonthlyStats();
  const { data: transactions = [] } = useTransactions();
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();

  const { overallScore, metrics, rating, color } = useMemo(() => {
    const metricsList: HealthMetric[] = [];

    // Calculate spending per budget category from transactions
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
      score: Math.round(savingsRate),
      status: savingsStatus,
      tip: savingsTip,
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
    
    let budgetScore = 0;
    let budgetStatus: HealthMetric['status'] = 'poor';
    let budgetTip = 'Set up budgets to track spending';

    if (budgetsWithSpending.length === 0) {
      budgetScore = 10;
      budgetStatus = 'warning';
      budgetTip = 'Create budgets for better control';
    } else if (budgetAdherence >= 90) {
      budgetScore = 25;
      budgetStatus = 'excellent';
      budgetTip = 'Perfect budget management!';
    } else if (budgetAdherence >= 75) {
      budgetScore = 20;
      budgetStatus = 'good';
      budgetTip = 'Most budgets on track';
    } else if (budgetAdherence >= 50) {
      budgetScore = 12;
      budgetStatus = 'warning';
      budgetTip = 'Review overspent categories';
    }

    metricsList.push({
      name: 'Budget Control',
      score: Math.round(budgetAdherence),
      status: budgetStatus,
      tip: budgetTip,
    });

    // 3. Goal Progress (0-25 points)
    const goalsWithProgress = goals.filter(g => Number(g.target_amount) > 0);
    const avgGoalProgress = goalsWithProgress.length > 0
      ? goalsWithProgress.reduce((sum, g) => 
          sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0
        ) / goalsWithProgress.length
      : 0;

    let goalScore = 0;
    let goalStatus: HealthMetric['status'] = 'warning';
    let goalTip = 'Set financial goals to stay motivated';

    if (goalsWithProgress.length === 0) {
      goalScore = 10;
      goalTip = 'Create savings goals';
    } else if (avgGoalProgress >= 75) {
      goalScore = 25;
      goalStatus = 'excellent';
      goalTip = 'Almost there! Keep pushing';
    } else if (avgGoalProgress >= 50) {
      goalScore = 20;
      goalStatus = 'good';
      goalTip = 'Good progress on your goals';
    } else if (avgGoalProgress >= 25) {
      goalScore = 15;
      goalStatus = 'warning';
      goalTip = 'Stay consistent with contributions';
    } else {
      goalScore = 10;
      goalStatus = 'poor';
      goalTip = 'Start contributing to your goals';
    }

    metricsList.push({
      name: 'Goal Progress',
      score: Math.round(avgGoalProgress),
      status: goalStatus,
      tip: goalTip,
    });

    // 4. Account Diversity (0-20 points)
    const accountTypes = new Set(accounts.map(a => a.type));
    const hasChecking = accounts.some(a => a.type === 'bank');
    const hasSavings = accounts.some(a => a.type === 'wallet' || a.type === 'investment');
    
    let diversityScore = 0;
    let diversityStatus: HealthMetric['status'] = 'poor';
    let diversityTip = 'Add different account types';

    if (accountTypes.size >= 3 && hasChecking && hasSavings) {
      diversityScore = 20;
      diversityStatus = 'excellent';
      diversityTip = 'Well-diversified accounts';
    } else if (accountTypes.size >= 2) {
      diversityScore = 15;
      diversityStatus = 'good';
      diversityTip = 'Consider investment accounts';
    } else if (accounts.length > 0) {
      diversityScore = 10;
      diversityStatus = 'warning';
      diversityTip = 'Add a savings account';
    }

    metricsList.push({
      name: 'Account Diversity',
      score: accountTypes.size * 25,
      status: diversityStatus,
      tip: diversityTip,
    });

    // Calculate overall score
    const total = savingsScore + budgetScore + goalScore + diversityScore;
    
    let ratingText = 'Needs Attention';
    let ratingColor = 'text-destructive';
    
    if (total >= 85) {
      ratingText = 'Excellent';
      ratingColor = 'text-income';
    } else if (total >= 70) {
      ratingText = 'Good';
      ratingColor = 'text-chart-1';
    } else if (total >= 50) {
      ratingText = 'Fair';
      ratingColor = 'text-chart-4';
    } else if (total >= 30) {
      ratingText = 'Needs Work';
      ratingColor = 'text-chart-5';
    }

    return {
      overallScore: total,
      metrics: metricsList,
      rating: ratingText,
      color: ratingColor,
    };
  }, [accounts, stats, budgets, goals, transactions]);

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle2 className="h-4 w-4 text-income" />;
      case 'good':
        return <TrendingUp className="h-4 w-4 text-chart-1" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-chart-4" />;
      case 'poor':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Financial Health
            </CardTitle>
            <div className={`text-lg md:text-xl font-bold ${color}`}>
              {overallScore}/100
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Score Ring */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 md:h-20 md:w-20">
              <svg className="transform -rotate-90 h-full w-full">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  className="fill-none stroke-muted"
                  strokeWidth="8"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  className={`fill-none ${
                    overallScore >= 70 ? 'stroke-income' : 
                    overallScore >= 50 ? 'stroke-chart-4' : 'stroke-destructive'
                  }`}
                  strokeWidth="8"
                  strokeDasharray={`${overallScore * 2.83} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className={`text-lg md:text-xl font-bold ${color}`}>{rating}</p>
              <p className="text-xs text-muted-foreground">
                {overallScore >= 70 
                  ? "You're doing great!" 
                  : "Room for improvement"}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(metric.status)}
                    <span className="font-medium">{metric.name}</span>
                  </div>
                  <span className="text-muted-foreground">{metric.score}%</span>
                </div>
                <Progress 
                  value={metric.score} 
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">{metric.tip}</p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
