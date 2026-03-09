import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, TrendingDown, TrendingUp, AlertTriangle, 
  Trophy, Lightbulb, Target, Loader2, RefreshCw, ChevronRight,
  DollarSign, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface Insight {
  type: 'saving' | 'warning' | 'opportunity' | 'achievement';
  title: string;
  description: string;
  potentialSaving?: number | null;
  priority: 'high' | 'medium' | 'low';
}

interface Recommendation {
  action: string;
  impact: string;
  difficulty: 'easy' | 'moderate' | 'hard';
}

interface AIInsights {
  overallScore: number;
  scoreLabel: string;
  topInsight: string;
  insights: Insight[];
  recommendations: Recommendation[];
  monthlyTarget: number;
}

export function AISpendingInsights() {
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: budgets = [] } = useBudgets();
  const { data: accounts = [] } = useAccounts();
  const { formatCurrency } = useCurrency();

  const spendingData = useMemo(() => {
    const now = new Date();
    const currentStart = startOfMonth(now);
    const currentEnd = endOfMonth(now);
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));

    const currentTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= currentStart && d <= currentEnd;
    });
    const prevTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= prevStart && d <= prevEnd;
    });

    const currentExpenses = currentTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const currentIncome = currentTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const prevIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

    const categoryBreakdown: Record<string, { name: string; current: number; previous: number }> = {};
    currentTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      if (!categoryBreakdown[t.category_id!]) {
        categoryBreakdown[t.category_id!] = { name: cat?.name || 'Unknown', current: 0, previous: 0 };
      }
      categoryBreakdown[t.category_id!].current += Number(t.amount);
    });
    prevTx.filter(t => t.type === 'expense' && t.category_id).forEach(t => {
      if (!categoryBreakdown[t.category_id!]) {
        const cat = categories.find(c => c.id === t.category_id);
        categoryBreakdown[t.category_id!] = { name: cat?.name || 'Unknown', current: 0, previous: 0 };
      }
      categoryBreakdown[t.category_id!].previous += Number(t.amount);
    });

    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

    return {
      currentMonth: format(now, 'MMMM yyyy'),
      currentExpenses,
      previousExpenses: prevExpenses,
      currentIncome,
      previousIncome: prevIncome,
      savingsRate: currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome * 100).toFixed(1) : '0',
      totalBalance,
      totalBudget,
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.current - a.current).slice(0, 8),
      transactionCount: currentTx.length,
    };
  }, [transactions, categories, budgets, accounts]);

  const analyzeSpending = async () => {
    if (transactions.length === 0) {
      toast({ title: 'No data to analyze', description: 'Add some transactions first', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('spending-insights', {
        body: { spendingData },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAiInsights(data as AIInsights);
      setHasAnalyzed(true);
    } catch (error: any) {
      toast({ title: 'Analysis failed', description: error.message || 'Please try again', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'saving': return DollarSign;
      case 'warning': return AlertTriangle;
      case 'opportunity': return Lightbulb;
      case 'achievement': return Trophy;
      default: return Sparkles;
    }
  };

  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'saving': return { bg: 'from-income/15 to-income/5', border: 'border-income/20', icon: 'text-income bg-income/20' };
      case 'warning': return { bg: 'from-expense/15 to-expense/5', border: 'border-expense/20', icon: 'text-expense bg-expense/20' };
      case 'opportunity': return { bg: 'from-primary/15 to-primary/5', border: 'border-primary/20', icon: 'text-primary bg-primary/20' };
      case 'achievement': return { bg: 'from-warning/15 to-warning/5', border: 'border-warning/20', icon: 'text-warning bg-warning/20' };
      default: return { bg: 'from-muted/50 to-muted/30', border: 'border-border', icon: 'text-muted-foreground bg-muted' };
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'border-income/30 text-income';
      case 'moderate': return 'border-warning/30 text-warning';
      case 'hard': return 'border-expense/30 text-expense';
      default: return '';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-income';
    if (score >= 60) return 'text-warning';
    return 'text-expense';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="stat-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base">AI Spending Insights</h3>
            <p className="text-[10px] text-muted-foreground">Powered by AI analysis</p>
          </div>
        </div>
        <Button
          variant={hasAnalyzed ? 'ghost' : 'default'}
          size="sm"
          onClick={analyzeSpending}
          disabled={isAnalyzing}
          className={cn('gap-2', !hasAnalyzed && 'btn-premium')}
        >
          {isAnalyzing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
          ) : hasAnalyzed ? (
            <><RefreshCw className="h-4 w-4" />Refresh</>
          ) : (
            <><Zap className="h-4 w-4" />Analyze</>
          )}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!hasAnalyzed && !isAnalyzing ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 text-center"
          >
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl" />
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                <Brain className="h-7 w-7 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm font-medium mb-1">AI-Powered Analysis</p>
            <p className="text-xs text-muted-foreground max-w-[250px]">
              Get personalized spending insights and savings recommendations based on your transaction history
            </p>
          </motion.div>
        ) : isAnalyzing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-8 gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Analyzing your spending patterns...</p>
          </motion.div>
        ) : aiInsights ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Financial Health Score</p>
                <p className="text-sm mt-0.5">{aiInsights.topInsight}</p>
              </div>
              <div className="text-center">
                <p className={cn('text-3xl font-bold', getScoreColor(aiInsights.overallScore))}>
                  {aiInsights.overallScore}
                </p>
                <p className="text-[10px] text-muted-foreground">{aiInsights.scoreLabel}</p>
              </div>
            </div>

            {/* Insights */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Insights</p>
              {aiInsights.insights?.map((insight, i) => {
                const Icon = getInsightIcon(insight.type);
                const styles = getInsightStyles(insight.type);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={cn('rounded-xl border p-3 bg-gradient-to-br', styles.bg, styles.border)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', styles.icon)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{insight.title}</p>
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{insight.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                        {insight.potentialSaving && (
                          <p className="text-xs font-bold text-income mt-1">
                            Potential saving: {formatCurrency(insight.potentialSaving)}/mo
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recommendations */}
            {aiInsights.recommendations?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recommendations</p>
                {aiInsights.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30"
                  >
                    <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.impact}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] h-4 px-1 shrink-0', getDifficultyColor(rec.difficulty))}>
                      {rec.difficulty}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Monthly Target */}
            {aiInsights.monthlyTarget > 0 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Suggested Monthly Target</span>
                </div>
                <span className="font-bold text-primary">{formatCurrency(aiInsights.monthlyTarget)}</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
