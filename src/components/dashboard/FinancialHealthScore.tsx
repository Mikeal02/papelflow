import { useMemo, memo } from 'react';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts } from '@/hooks/useAccounts';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { MultiProgressRing } from '@/components/ui/progress-ring';
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

export const FinancialHealthScore = memo(function FinancialHealthScore() {
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

    // 1. Savings Rate (0-30)
    const savingsRate = stats?.income ? ((stats.income - stats.expenses) / stats.income) * 100 : 0;
    let savingsScore = 0;
    let savingsStatus: HealthMetric['status'] = 'poor';
    let savingsTip = 'Try to save at least 20% of your income';
    if (savingsRate >= 30) { savingsScore = 30; savingsStatus = 'excellent'; savingsTip = 'Excellent savings rate!'; }
    else if (savingsRate >= 20) { savingsScore = 25; savingsStatus = 'good'; savingsTip = 'Great job!'; }
    else if (savingsRate >= 10) { savingsScore = 15; savingsStatus = 'warning'; savingsTip = 'Try to increase to 20%'; }
    else if (savingsRate > 0) { savingsScore = 10; savingsStatus = 'warning'; savingsTip = 'Look for ways to reduce expenses'; }

    metricsList.push({ name: 'Savings Rate', score: savingsScore, maxScore: 30, status: savingsStatus, tip: savingsTip, color: 'hsl(var(--income))' });

    // 2. Budget Adherence (0-25)
    const budgetsWithSpending = budgets.filter(b => Number(b.amount) > 0);
    const onBudgetCount = budgetsWithSpending.filter(b => (monthlyExpenses[b.category_id] || 0) <= Number(b.amount)).length;
    const budgetAdherence = budgetsWithSpending.length > 0 ? (onBudgetCount / budgetsWithSpending.length) * 100 : 100;
    const budgetScore = budgetsWithSpending.length === 0 ? 10 : Math.round((budgetAdherence / 100) * 25);
    const budgetStatus: HealthMetric['status'] = budgetAdherence >= 90 ? 'excellent' : budgetAdherence >= 75 ? 'good' : budgetAdherence >= 50 ? 'warning' : 'poor';
    metricsList.push({ name: 'Budget Control', score: budgetScore, maxScore: 25, status: budgetStatus, tip: budgetStatus === 'excellent' ? 'Perfect budget management!' : 'Review overspent categories', color: 'hsl(var(--primary))' });

    // 3. Goal Progress (0-25)
    const goalsWithProgress = goals.filter(g => Number(g.target_amount) > 0);
    const avgGoalProgress = goalsWithProgress.length > 0 ? goalsWithProgress.reduce((sum, g) => sum + (Number(g.current_amount) / Number(g.target_amount)) * 100, 0) / goalsWithProgress.length : 0;
    const goalScore = goalsWithProgress.length === 0 ? 10 : Math.round((avgGoalProgress / 100) * 25);
    const goalStatus: HealthMetric['status'] = avgGoalProgress >= 75 ? 'excellent' : avgGoalProgress >= 50 ? 'good' : avgGoalProgress >= 25 ? 'warning' : 'poor';
    metricsList.push({ name: 'Goal Progress', score: goalScore, maxScore: 25, status: goalStatus, tip: goalStatus === 'excellent' ? 'Almost there!' : 'Stay consistent', color: 'hsl(var(--accent))' });

    // 4. Account Diversity (0-20)
    const accountTypes = new Set(accounts.map(a => a.type));
    const diversityScore = Math.min(accountTypes.size * 5, 20);
    const diversityStatus: HealthMetric['status'] = diversityScore >= 15 ? 'excellent' : diversityScore >= 10 ? 'good' : 'warning';
    metricsList.push({ name: 'Account Diversity', score: diversityScore, maxScore: 20, status: diversityStatus, tip: diversityStatus === 'excellent' ? 'Well-diversified' : 'Consider investment accounts', color: 'hsl(var(--chart-4))' });

    const total = metricsList.reduce((s, m) => s + m.score, 0);
    let ratingText = 'Needs Attention';
    let color = 'text-destructive';
    if (total >= 85) { ratingText = 'Excellent'; color = 'text-income'; }
    else if (total >= 70) { ratingText = 'Good'; color = 'text-chart-1'; }
    else if (total >= 50) { ratingText = 'Fair'; color = 'text-chart-4'; }
    else if (total >= 30) { ratingText = 'Needs Work'; color = 'text-chart-5'; }

    const segmentsData = metricsList.map(m => ({ value: (m.score / 100) * 100, color: m.color }));

    return { overallScore: total, metrics: metricsList, rating: ratingText, ratingColor: color, segments: segmentsData };
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
    <GlowingBorder glowColor={overallScore >= 70 ? 'income' : overallScore >= 50 ? 'primary' : 'expense'} intensity="medium">
      <Card className="border-0 bg-transparent overflow-hidden">
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
                style={{ boxShadow: '0 4px 15px hsl(var(--primary) / 0.3)' }}
              >
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              Financial Health
            </CardTitle>
            <GradientBadge variant={overallScore >= 70 ? 'success' : overallScore >= 50 ? 'primary' : 'warning'}>
              <Sparkles className="h-3 w-3" />
              {rating}
            </GradientBadge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 relative">
          {/* Score Ring */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <MultiProgressRing segments={segments} size={80} strokeWidth={9}>
                <span className={cn('text-2xl font-bold', ratingColor)}>
                  {overallScore}
                </span>
              </MultiProgressRing>
            </div>
            <div className="flex-1">
              <p className={cn('text-xl font-bold', ratingColor)}>{rating}</p>
              <p className="text-sm text-muted-foreground">
                {overallScore >= 70 ? "Excellent financial health!" : "Room for improvement"}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            {metrics.map((metric) => (
              <div
                key={metric.name}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-default group"
              >
                <div className="shrink-0 transition-transform duration-200 group-hover:scale-110">
                  {getStatusIcon(metric.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold truncate">{metric.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{metric.score}/{metric.maxScore}</span>
                  </div>
                  <div className="h-2 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(metric.score / metric.maxScore) * 100}%`,
                        backgroundColor: metric.color,
                        boxShadow: `0 0 8px ${metric.color}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </GlowingBorder>
  );
});
