import { useState, lazy, Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Sparkles } from 'lucide-react';

import { StatCard } from '@/components/dashboard/StatCard';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { SmartNudges } from '@/components/dashboard/SmartNudges';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { PageTransition } from '@/components/layout/PageTransition';
import { DashboardSkeleton } from '@/components/ui/elite-skeleton';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useBillReminders } from '@/hooks/useBillReminders';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { AnimatePresence } from 'framer-motion';

// Lazy-load below-fold heavy widgets
const SmartTransactionEntry = lazy(() => import('@/components/transactions/SmartTransactionEntry').then(m => ({ default: m.SmartTransactionEntry })));
const NetWorthMini = lazy(() => import('@/components/dashboard/NetWorthMini').then(m => ({ default: m.NetWorthMini })));
const SmartInsights = lazy(() => import('@/components/insights/SmartInsights').then(m => ({ default: m.SmartInsights })));
const MoneyFlowSankey = lazy(() => import('@/components/dashboard/MoneyFlowSankey').then(m => ({ default: m.MoneyFlowSankey })));
const CashFlowChart = lazy(() => import('@/components/dashboard/CashFlowChart').then(m => ({ default: m.CashFlowChart })));
const SavingsRateGauge = lazy(() => import('@/components/dashboard/SavingsRateGauge').then(m => ({ default: m.SavingsRateGauge })));
const BudgetOverview = lazy(() => import('@/components/dashboard/BudgetOverview').then(m => ({ default: m.BudgetOverview })));
const TopCategories = lazy(() => import('@/components/dashboard/TopCategories').then(m => ({ default: m.TopCategories })));
const FinancialCalendar = lazy(() => import('@/components/dashboard/FinancialCalendar').then(m => ({ default: m.FinancialCalendar })));
const SpendingForecast = lazy(() => import('@/components/dashboard/SpendingForecast').then(m => ({ default: m.SpendingForecast })));
const FinancialHealthScore = lazy(() => import('@/components/dashboard/FinancialHealthScore').then(m => ({ default: m.FinancialHealthScore })));
const AISpendingInsights = lazy(() => import('@/components/dashboard/AISpendingInsights').then(m => ({ default: m.AISpendingInsights })));
const SpendingHeatmapCalendar = lazy(() => import('@/components/dashboard/SpendingHeatmapCalendar').then(m => ({ default: m.SpendingHeatmapCalendar })));
const WhatIfScenario = lazy(() => import('@/components/dashboard/WhatIfScenario').then(m => ({ default: m.WhatIfScenario })));
const FutureYouSimulator = lazy(() => import('@/components/dashboard/FutureYouSimulator').then(m => ({ default: m.FutureYouSimulator })));
const GoalsMini = lazy(() => import('@/components/dashboard/GoalsMini').then(m => ({ default: m.GoalsMini })));
const DailySpendingTracker = lazy(() => import('@/components/dashboard/DailySpendingTracker').then(m => ({ default: m.DailySpendingTracker })));
const SpendingByTimeOfDay = lazy(() => import('@/components/dashboard/SpendingByTimeOfDay').then(m => ({ default: m.SpendingByTimeOfDay })));
const AccountsOverview = lazy(() => import('@/components/dashboard/AccountsOverview').then(m => ({ default: m.AccountsOverview })));
const CurrencyConverter = lazy(() => import('@/components/dashboard/CurrencyConverter').then(m => ({ default: m.CurrencyConverter })));
const UpcomingBills = lazy(() => import('@/components/dashboard/UpcomingBills').then(m => ({ default: m.UpcomingBills })));
const FinancialAdvisor = lazy(() => import('@/components/ai/FinancialAdvisor').then(m => ({ default: m.FinancialAdvisor })));

const WidgetFallback = memo(() => (
  <div className="rounded-2xl border border-border/30 bg-card/40 animate-pulse h-48" />
));
WidgetFallback.displayName = 'WidgetFallback';

const SectionHeader = memo(({ title, description }: { title: string; description?: string }) => (
  <div className="space-y-0.5 mb-1">
    <h2 className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-[0.12em]">{title}</h2>
    {description && <p className="text-[11px] text-muted-foreground/40">{description}</p>}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const { data: transactions = [], isLoading: txLoading } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useRecurringTransactions();
  useBillReminders();
  useRealtimeTransactions();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const isInitialLoading = statsLoading && accountsLoading && txLoading;

  return (
    <>
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <PageTransition>
          <div className="space-y-8 lg:space-y-10">
            <WelcomeHeader />

            <AnimatePresence>
              {showQuickAdd && (
                <Suspense fallback={<WidgetFallback />}>
                  <SmartTransactionEntry onClose={() => setShowQuickAdd(false)} />
                </Suspense>
              )}
            </AnimatePresence>

            {!showQuickAdd && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowQuickAdd(true)}
                className="w-full rounded-xl border border-dashed border-primary/15 p-3.5 text-[13px] text-muted-foreground/60 hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all text-center group"
              >
                <Sparkles className="h-3.5 w-3.5 inline mr-2 group-hover:text-primary transition-colors" />
                Quick add — type naturally e.g. "Spent $50 at Starbucks"
              </motion.button>
            )}

            <SmartNudges />

            {/* Key Metrics */}
            <div>
              <SectionHeader title="Key Metrics" />
              <div className="grid gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Income" value={formatCurrency(stats?.income || 0)} icon={TrendingUp} iconColor="bg-gradient-to-br from-income/20 to-income/10 text-income" delay={0.05} autoCompare="income" />
                <StatCard title="Total Expenses" value={formatCurrency(stats?.expenses || 0)} icon={TrendingDown} iconColor="bg-gradient-to-br from-expense/20 to-expense/10 text-expense" delay={0.1} autoCompare="expense" />
                <StatCard title="Net Cash Flow" value={formatCurrency(stats?.netFlow || 0, true)} icon={Scale} iconColor="bg-gradient-to-br from-primary/20 to-primary/10 text-primary" delay={0.15} autoCompare="net" />
                <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={Wallet} iconColor="bg-gradient-to-br from-accent/20 to-accent/10 text-accent" delay={0.2} />
              </div>
            </div>

            <QuickStats />

            {/* Insights & Net Worth */}
            <div>
              <SectionHeader title="Wealth Overview" />
              <Suspense fallback={<div className="grid gap-5 lg:grid-cols-2"><WidgetFallback /><WidgetFallback /></div>}>
                <div className="grid gap-5 lg:grid-cols-2">
                  <NetWorthMini />
                  {transactions.length > 0 && (
                    <SmartInsights transactions={transactions} categories={categories} formatCurrency={formatCurrency} />
                  )}
                </div>
              </Suspense>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-5 lg:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <SectionHeader title="Activity" />
                  <RecentTransactions />
                </div>
                <Suspense fallback={<WidgetFallback />}><MoneyFlowSankey /></Suspense>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Suspense fallback={<WidgetFallback />}><CashFlowChart /></Suspense>
                  <Suspense fallback={<WidgetFallback />}><SavingsRateGauge /></Suspense>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Suspense fallback={<WidgetFallback />}><BudgetOverview /></Suspense>
                  <Suspense fallback={<WidgetFallback />}><TopCategories /></Suspense>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Suspense fallback={<WidgetFallback />}><FinancialCalendar /></Suspense>
                  <Suspense fallback={<WidgetFallback />}><SpendingForecast /></Suspense>
                </div>
              </div>

              <div className="space-y-5">
                <SectionHeader title="Intelligence" />
                <Suspense fallback={<WidgetFallback />}><FinancialHealthScore /></Suspense>
                <Suspense fallback={<WidgetFallback />}><AISpendingInsights /></Suspense>
                <Suspense fallback={<WidgetFallback />}><SpendingHeatmapCalendar /></Suspense>
                <Suspense fallback={<WidgetFallback />}><WhatIfScenario /></Suspense>
                <Suspense fallback={<WidgetFallback />}><FutureYouSimulator /></Suspense>
                <Suspense fallback={<WidgetFallback />}><GoalsMini /></Suspense>
                <Suspense fallback={<WidgetFallback />}><DailySpendingTracker /></Suspense>
                <Suspense fallback={<WidgetFallback />}><SpendingByTimeOfDay /></Suspense>
                <Suspense fallback={<WidgetFallback />}><AccountsOverview /></Suspense>
                <Suspense fallback={<WidgetFallback />}><CurrencyConverter /></Suspense>
                <Suspense fallback={<WidgetFallback />}><UpcomingBills /></Suspense>
              </div>
            </div>
          </div>
        </PageTransition>
      )}

      <Suspense fallback={null}><FinancialAdvisor /></Suspense>
    </>
  );
};

export default Dashboard;
