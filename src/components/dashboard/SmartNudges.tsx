import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, TrendingDown, AlertTriangle, PiggyBank, Zap, ArrowRight, X, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions, useMonthlyStats } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCurrency } from '@/contexts/CurrencyContext';
import { differenceInDays, subMonths, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Nudge {
  id: string;
  title: string;
  description: string;
  icon: typeof Lightbulb;
  type: 'warning' | 'opportunity' | 'celebration' | 'tip';
  priority: number;
  actionLabel?: string;
}

const typeStyles = {
  warning: 'border-warning/30 bg-warning/5',
  opportunity: 'border-primary/30 bg-primary/5',
  celebration: 'border-income/30 bg-income/5',
  tip: 'border-accent/30 bg-accent/5',
};

const typeIconStyles = {
  warning: 'bg-warning/10 text-warning',
  opportunity: 'bg-primary/10 text-primary',
  celebration: 'bg-income/10 text-income',
  tip: 'bg-accent/10 text-accent',
};

export const SmartNudges = memo(function SmartNudges() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const { data: transactions = [] } = useTransactions();
  const { data: stats } = useMonthlyStats();
  const { data: budgets = [] } = useBudgets();
  const { data: goals = [] } = useGoals();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { formatCurrency } = useCurrency();

  const nudges = useMemo(() => {
    const result: Nudge[] = [];
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);

    // Budget overspend warnings
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(currentMonth));
    const categorySpend: Record<string, number> = {};
    monthExpenses.forEach(t => {
      if (t.category_id) categorySpend[t.category_id] = (categorySpend[t.category_id] || 0) + Number(t.amount);
    });

    budgets.forEach(b => {
      const spent = categorySpend[b.category_id] || 0;
      const pct = (spent / Number(b.amount)) * 100;
      const cat = categories.find(c => c.id === b.category_id);
      if (pct >= 80 && pct < 100) {
        result.push({
          id: `budget-warn-${b.id}`,
          title: `${cat?.name || 'Budget'} at ${Math.round(pct)}%`,
          description: `You've spent ${formatCurrency(spent)} of ${formatCurrency(Number(b.amount))}. Consider slowing down.`,
          icon: AlertTriangle,
          type: 'warning',
          priority: 9,
        });
      }
    });

    // Surplus cash opportunity
    const surplus = (stats?.income || 0) - (stats?.expenses || 0);
    if (surplus > 100) {
      const goalWithLeast = goals.sort((a, b) => {
        const pctA = Number(a.current_amount || 0) / Number(a.target_amount);
        const pctB = Number(b.current_amount || 0) / Number(b.target_amount);
        return pctA - pctB;
      })[0];

      result.push({
        id: 'surplus-opportunity',
        title: `${formatCurrency(surplus)} surplus this month`,
        description: goalWithLeast
          ? `Consider allocating some to "${goalWithLeast.name}" (${Math.round((Number(goalWithLeast.current_amount || 0) / Number(goalWithLeast.target_amount)) * 100)}% complete)`
          : 'Great cash flow! Consider starting a savings goal.',
        icon: PiggyBank,
        type: 'opportunity',
        priority: 7,
      });
    }

    // Savings rate celebration
    const savingsRate = (stats?.income || 0) > 0 ? ((surplus / (stats?.income || 1)) * 100) : 0;
    if (savingsRate >= 20) {
      result.push({
        id: 'savings-celebration',
        title: `${Math.round(savingsRate)}% savings rate!`,
        description: 'You\'re saving more than the recommended 20%. Keep it up!',
        icon: CheckCircle2,
        type: 'celebration',
        priority: 5,
      });
    }

    // Subscription optimization
    const activeUnseen = subscriptions.filter(s => {
      if (!s.is_active) return false;
      const relatedTx = transactions.filter(t =>
        t.payee?.toLowerCase().includes(s.name.toLowerCase()) ||
        t.notes?.toLowerCase().includes(s.name.toLowerCase())
      );
      return relatedTx.length === 0; // No matching transactions means potentially unused
    });
    if (activeUnseen.length > 0) {
      const totalWaste = activeUnseen.reduce((s, sub) => s + Number(sub.amount), 0);
      result.push({
        id: 'unused-subs',
        title: `${activeUnseen.length} potentially unused subscriptions`,
        description: `Review ${activeUnseen.map(s => s.name).slice(0, 3).join(', ')} — could save ${formatCurrency(totalWaste)}/mo`,
        icon: Zap,
        type: 'tip',
        priority: 6,
      });
    }

    // Spending trend comparison
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    const lastMonthExpenses = transactions
      .filter(t => t.type === 'expense' && t.date?.startsWith(lastMonth))
      .reduce((s, t) => s + Number(t.amount), 0);
    const thisMonthExpenses = stats?.expenses || 0;

    if (lastMonthExpenses > 0 && thisMonthExpenses > lastMonthExpenses * 1.15) {
      result.push({
        id: 'spending-spike',
        title: 'Spending up vs last month',
        description: `You've spent ${Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100)}% more than last month. Review recent expenses.`,
        icon: TrendingDown,
        type: 'warning',
        priority: 8,
      });
    }

    // Emergency fund check
    const totalBalance = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    const monthlyExpense = stats?.expenses || 0;
    const monthsCovered = monthlyExpense > 0 ? totalBalance / monthlyExpense : 0;
    if (monthsCovered < 3 && monthlyExpense > 0) {
      result.push({
        id: 'emergency-fund',
        title: 'Build your emergency fund',
        description: `Your balance covers ${monthsCovered.toFixed(1)} months of expenses. Aim for 3-6 months.`,
        icon: Lightbulb,
        type: 'tip',
        priority: 4,
      });
    }

    return result
      .filter(n => !dismissed.has(n.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
  }, [transactions, stats, budgets, goals, subscriptions, categories, accounts, formatCurrency, dismissed]);

  if (nudges.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="stat-card overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            Smart Nudges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence mode="popLayout">
            {nudges.map((nudge, i) => (
              <motion.div
                key={nudge.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn('rounded-xl border p-3 flex gap-3', typeStyles[nudge.type])}
              >
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', typeIconStyles[nudge.type])}>
                  <nudge.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold">{nudge.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{nudge.description}</p>
                </div>
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, nudge.id]))}
                  className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-muted/50 shrink-0 self-start"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
