import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useGoals } from '@/hooks/useGoals';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

export const WhatIfScenario = () => {
  const { data: stats } = useMonthlyStats();
  const { data: goals = [] } = useGoals();
  const { data: transactions = [] } = useTransactions();
  const { formatCurrency } = useCurrency();

  const [spendingReduction, setSpendingReduction] = useState(10);
  const [additionalIncome, setAdditionalIncome] = useState(0);
  const [months, setMonths] = useState(12);

  const currentIncome = stats?.income || 0;
  const currentExpenses = stats?.expenses || 0;

  const scenarios = useMemo(() => {
    const adjustedExpenses = currentExpenses * (1 - spendingReduction / 100);
    const adjustedIncome = currentIncome + additionalIncome;
    const monthlySavings = adjustedIncome - adjustedExpenses;
    const currentSavings = currentIncome - currentExpenses;
    const extraSavings = monthlySavings - currentSavings;

    // Impact on goals
    const activeGoal = goals[0];
    const goalRemaining = activeGoal ? Number(activeGoal.target_amount) - Number(activeGoal.current_amount || 0) : 0;
    const currentMonthsToGoal = currentSavings > 0 ? Math.ceil(goalRemaining / currentSavings) : Infinity;
    const newMonthsToGoal = monthlySavings > 0 ? Math.ceil(goalRemaining / monthlySavings) : Infinity;
    const monthsSaved = currentMonthsToGoal - newMonthsToGoal;

    // Projection
    const totalExtraSaved = extraSavings * months;

    return {
      adjustedExpenses,
      adjustedIncome,
      monthlySavings,
      currentSavings,
      extraSavingsMonthly: extraSavings,
      totalExtraSaved,
      goalName: activeGoal?.name || 'Your Goal',
      currentMonthsToGoal: currentMonthsToGoal === Infinity ? '∞' : currentMonthsToGoal,
      newMonthsToGoal: newMonthsToGoal === Infinity ? '∞' : newMonthsToGoal,
      monthsSaved: monthsSaved === Infinity ? 0 : monthsSaved,
      yearlyImpact: extraSavings * 12,
    };
  }, [currentIncome, currentExpenses, spendingReduction, additionalIncome, months, goals]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="stat-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            What-If Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Reduce spending by</label>
                <span className="text-sm font-bold text-primary">{spendingReduction}%</span>
              </div>
              <Slider
                value={[spendingReduction]}
                onValueChange={([v]) => setSpendingReduction(v)}
                max={50}
                step={5}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Additional monthly income</label>
                <span className="text-sm font-bold text-income">{formatCurrency(additionalIncome)}</span>
              </div>
              <Slider
                value={[additionalIncome]}
                onValueChange={([v]) => setAdditionalIncome(v)}
                max={2000}
                step={100}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Projection period</label>
                <span className="text-sm font-bold">{months} months</span>
              </div>
              <Slider
                value={[months]}
                onValueChange={([v]) => setMonths(v)}
                min={3}
                max={60}
                step={3}
                className="w-full"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-income/5 border border-income/20 p-3 text-center">
                <TrendingUp className="h-4 w-4 text-income mx-auto mb-1" />
                <p className="text-lg font-bold text-income">{formatCurrency(scenarios.extraSavingsMonthly)}</p>
                <p className="text-[10px] text-muted-foreground">Extra/month</p>
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-center">
                <DollarSign className="h-4 w-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-primary">{formatCurrency(scenarios.totalExtraSaved)}</p>
                <p className="text-[10px] text-muted-foreground">In {months} months</p>
              </div>
            </div>

            {goals.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs font-medium mb-2">Impact on "{scenarios.goalName}"</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{scenarios.currentMonthsToGoal} mo</span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                  <span className="font-bold text-income">{scenarios.newMonthsToGoal} mo</span>
                  {scenarios.monthsSaved > 0 && (
                    <span className="text-[10px] text-income ml-auto">
                      {scenarios.monthsSaved} months faster!
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-medium mb-1">Yearly Impact</p>
              <p className={cn('text-lg font-bold', scenarios.yearlyImpact >= 0 ? 'text-income' : 'text-expense')}>
                {formatCurrency(scenarios.yearlyImpact)}
              </p>
              <p className="text-[10px] text-muted-foreground">additional savings per year</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
