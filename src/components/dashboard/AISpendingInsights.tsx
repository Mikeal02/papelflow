import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, TrendingDown, TrendingUp, AlertTriangle, 
  Trophy, Lightbulb, Target, Loader2, RefreshCw, ChevronRight,
  DollarSign, Shield, Zap, Activity
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
import { ProgressRing } from '@/components/ui/progress-ring';

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
      case 'saving': return { bg: 'from-income/20 via-income/10 to-transparent', border: 'border-income/30', icon: 'text-income bg-gradient-to-br from-income/30 to-income/10', glow: 'shadow-income/20' };
      case 'warning': return { bg: 'from-expense/20 via-expense/10 to-transparent', border: 'border-expense/30', icon: 'text-expense bg-gradient-to-br from-expense/30 to-expense/10', glow: 'shadow-expense/20' };
      case 'opportunity': return { bg: 'from-primary/20 via-primary/10 to-transparent', border: 'border-primary/30', icon: 'text-primary bg-gradient-to-br from-primary/30 to-primary/10', glow: 'shadow-primary/20' };
      case 'achievement': return { bg: 'from-warning/20 via-warning/10 to-transparent', border: 'border-warning/30', icon: 'text-warning bg-gradient-to-br from-warning/30 to-warning/10', glow: 'shadow-warning/20' };
      default: return { bg: 'from-muted/50 to-muted/30', border: 'border-border', icon: 'text-muted-foreground bg-muted', glow: '' };
    }
  };

  const getDifficultyStyles = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-income/10 border-income/30 text-income';
      case 'moderate': return 'bg-warning/10 border-warning/30 text-warning';
      case 'hard': return 'bg-expense/10 border-expense/30 text-expense';
      default: return '';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'income';
    if (score >= 60) return 'accent';
    return 'expense';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="stat-card relative overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      {/* Holographic sweep effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
        animate={{ x: ['-100%', '200%'] }}
        transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-accent/20 to-primary/15"
            animate={{ 
              boxShadow: [
                '0 0 20px hsl(var(--primary) / 0.2)',
                '0 0 35px hsl(var(--primary) / 0.4)',
                '0 0 20px hsl(var(--primary) / 0.2)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Brain className="h-5 w-5 text-primary" />
            <motion.div
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>
          <div>
            <h3 className="font-bold text-base bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">AI Spending Insights</h3>
            <div className="flex items-center gap-1.5">
              <motion.span 
                className="h-1.5 w-1.5 rounded-full bg-income"
                animate={{ opacity: [1, 0.5, 1], scale: [1, 0.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <p className="text-[10px] text-muted-foreground">Powered by AI</p>
            </div>
          </div>
        </div>
        <Button
          variant={hasAnalyzed ? 'outline' : 'default'}
          size="sm"
          onClick={analyzeSpending}
          disabled={isAnalyzing}
          className={cn(
            'gap-2 transition-all duration-300',
            !hasAnalyzed && 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25'
          )}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex flex-col items-center py-10 text-center"
          >
            {/* Floating orbs */}
            <motion.div
              className="absolute top-4 left-1/4 h-16 w-16 rounded-full bg-primary/10 blur-2xl"
              animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div
              className="absolute bottom-4 right-1/4 h-12 w-12 rounded-full bg-accent/10 blur-xl"
              animate={{ y: [0, 8, 0], x: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            
            <motion.div 
              className="relative mb-5"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 blur-2xl" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-muted/90 to-muted/70 flex items-center justify-center border border-border/50 backdrop-blur-sm">
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
            </motion.div>
            <p className="text-sm font-semibold mb-1.5">AI-Powered Financial Analysis</p>
            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
              Get personalized spending insights, savings recommendations, and financial health scores
            </p>
          </motion.div>
        ) : isAnalyzing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-col items-center py-12 gap-4"
          >
            {/* Pulse rings */}
            <div className="relative">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-accent/20"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              />
              <motion.div
                className="relative h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Activity className="h-6 w-6 text-primary" />
              </motion.div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Analyzing spending patterns...</p>
              <motion.p 
                className="text-xs text-muted-foreground mt-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                AI is processing your data
              </motion.p>
            </div>
          </motion.div>
        ) : aiInsights ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative space-y-5"
          >
            {/* Score card */}
            <motion.div 
              className="relative p-4 rounded-2xl bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 border border-border/50 overflow-hidden"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {/* Score glow */}
              <motion.div
                className={cn(
                  "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl",
                  aiInsights.overallScore >= 80 ? "bg-income/20" : aiInsights.overallScore >= 60 ? "bg-accent/20" : "bg-expense/20"
                )}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Financial Health Score</p>
                  <p className="text-sm leading-relaxed">{aiInsights.topInsight}</p>
                </div>
                <div className="ml-4">
                  <ProgressRing 
                    progress={aiInsights.overallScore} 
                    size={72} 
                    strokeWidth={6} 
                    color={getScoreColor(aiInsights.overallScore)}
                    showGlow
                  >
                    <div className="text-center">
                      <motion.span 
                        className={cn('text-xl font-bold', `text-${getScoreColor(aiInsights.overallScore)}`)}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                      >
                        {aiInsights.overallScore}
                      </motion.span>
                      <p className="text-[9px] text-muted-foreground -mt-0.5">{aiInsights.scoreLabel}</p>
                    </div>
                  </ProgressRing>
                </div>
              </div>
            </motion.div>

            {/* Insights */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                Key Insights
              </p>
              {aiInsights.insights?.map((insight, i) => {
                const Icon = getInsightIcon(insight.type);
                const styles = getInsightStyles(insight.type);
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring', stiffness: 300 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className={cn(
                      'relative rounded-xl border p-3.5 bg-gradient-to-br overflow-hidden transition-all duration-300',
                      styles.bg, 
                      styles.border,
                      'hover:shadow-lg',
                      styles.glow
                    )}
                  >
                    {/* Subtle shine effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    
                    <div className="relative flex items-start gap-3">
                      <motion.div 
                        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', styles.icon)}
                        whileHover={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{insight.title}</p>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] h-4 px-1.5 font-medium",
                              insight.priority === 'high' && 'border-expense/40 text-expense',
                              insight.priority === 'medium' && 'border-warning/40 text-warning',
                              insight.priority === 'low' && 'border-muted-foreground/40 text-muted-foreground'
                            )}
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
                        {insight.potentialSaving && (
                          <motion.p 
                            className="text-xs font-bold text-income mt-1.5 flex items-center gap-1"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                          >
                            <TrendingUp className="h-3 w-3" />
                            Save up to {formatCurrency(insight.potentialSaving)}/mo
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recommendations */}
            {aiInsights.recommendations?.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Target className="h-3 w-3" />
                  Recommendations
                </p>
                {aiInsights.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, type: 'spring' }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                  >
                    <motion.div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                      whileHover={{ scale: 1.1 }}
                    >
                      <ChevronRight className="h-3.5 w-3.5 text-primary" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.impact}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn('text-[9px] h-5 px-2 shrink-0 font-medium', getDifficultyStyles(rec.difficulty))}
                    >
                      {rec.difficulty}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Monthly Target */}
            {aiInsights.monthlyTarget > 0 && (
              <motion.div 
                className="relative flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 border border-primary/25 overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.01 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
                <div className="relative flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Suggested Monthly Target</span>
                </div>
                <motion.span 
                  className="relative font-bold text-lg text-primary"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                >
                  {formatCurrency(aiInsights.monthlyTarget)}
                </motion.span>
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
