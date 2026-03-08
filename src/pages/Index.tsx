import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Scale, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { BudgetOverview } from '@/components/dashboard/BudgetOverview';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { UpcomingBills } from '@/components/dashboard/UpcomingBills';
import { SmartInsights } from '@/components/insights/SmartInsights';
import { FinancialHealthScore } from '@/components/dashboard/FinancialHealthScore';
import { FinancialCalendar } from '@/components/dashboard/FinancialCalendar';
import { SpendingForecast } from '@/components/dashboard/SpendingForecast';
import { FinancialAdvisor } from '@/components/ai/FinancialAdvisor';
import { CurrencyConverter } from '@/components/dashboard/CurrencyConverter';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { SavingsRateGauge } from '@/components/dashboard/SavingsRateGauge';
import { DailySpendingTracker } from '@/components/dashboard/DailySpendingTracker';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { NetWorthMini } from '@/components/dashboard/NetWorthMini';
import { GoalsMini } from '@/components/dashboard/GoalsMini';
import { SpendingByTimeOfDay } from '@/components/dashboard/SpendingByTimeOfDay';
import { SmartNudges } from '@/components/dashboard/SmartNudges';
import { WhatIfScenario } from '@/components/dashboard/WhatIfScenario';
import { FutureYouSimulator } from '@/components/dashboard/FutureYouSimulator';
import { SmartTransactionEntry } from '@/components/transactions/SmartTransactionEntry';
import { MoneyFlowSankey } from '@/components/dashboard/MoneyFlowSankey';
import { SpendingHeatmapCalendar } from '@/components/dashboard/SpendingHeatmapCalendar';
import { PageTransition } from '@/components/layout/PageTransition';
import { useMonthlyStats, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useBillReminders } from '@/hooks/useBillReminders';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { AnimatePresence } from 'framer-motion';

const Dashboard = () => {
  const { data: stats, isLoading: statsLoading } = useMonthlyStats();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { formatCurrency } = useCurrency();
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  useRecurringTransactions();
  useBillReminders();
  useRealtimeTransactions();

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <AppLayout>
      <PageTransition>
        <div className="space-y-5 lg:space-y-7">
          {/* Header */}
          <WelcomeHeader />

          {/* Smart Quick Add */}
          <AnimatePresence>
            {showQuickAdd && (
              <SmartTransactionEntry onClose={() => setShowQuickAdd(false)} />
            )}
          </AnimatePresence>

          {!showQuickAdd && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowQuickAdd(true)}
              className="w-full rounded-xl border border-dashed border-primary/30 p-3 text-sm text-muted-foreground hover:border-primary/60 hover:text-foreground hover:bg-primary/5 transition-all text-center"
            >
              <Sparkles className="h-4 w-4 inline mr-2" />
              Quick add: type naturally e.g. "Spent $50 at Starbucks"
            </motion.button>
          )}

          {/* Smart Nudges */}
          <SmartNudges />

          {/* Stats Grid */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Income"
              value={formatCurrency(stats?.income || 0)}
              icon={TrendingUp}
              iconColor="bg-gradient-to-br from-income/20 to-income/10 text-income"
              delay={0.05}
              autoCompare="income"
            />
            <StatCard
              title="Total Expenses"
              value={formatCurrency(stats?.expenses || 0)}
              icon={TrendingDown}
              iconColor="bg-gradient-to-br from-expense/20 to-expense/10 text-expense"
              delay={0.1}
              autoCompare="expense"
            />
            <StatCard
              title="Net Cash Flow"
              value={formatCurrency(stats?.netFlow || 0, true)}
              icon={Scale}
              iconColor="bg-gradient-to-br from-primary/20 to-primary/10 text-primary"
              delay={0.15}
              autoCompare="net"
            />
            <StatCard
              title="Total Balance"
              value={formatCurrency(totalBalance)}
              icon={Wallet}
              iconColor="bg-gradient-to-br from-accent/20 to-accent/10 text-accent"
              delay={0.2}
            />
          </div>

          {/* Quick Stats Row */}
          <QuickStats />

          {/* Net Worth Trend + Smart Insights */}
          <div className="grid gap-4 lg:grid-cols-2">
            <NetWorthMini />
            {transactions.length > 0 && (
              <SmartInsights
                transactions={transactions}
                categories={categories}
                formatCurrency={formatCurrency}
              />
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 lg:gap-5 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4 lg:space-y-5">
              <RecentTransactions />
              <MoneyFlowSankey />
              <div className="grid gap-4 sm:grid-cols-2">
                <CashFlowChart />
                <SavingsRateGauge />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <BudgetOverview />
                <TopCategories />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FinancialCalendar />
                <SpendingForecast />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 lg:space-y-5">
              <FinancialHealthScore />
              <SpendingHeatmapCalendar />
              <WhatIfScenario />
              <FutureYouSimulator />
              <GoalsMini />
              <DailySpendingTracker />
              <SpendingByTimeOfDay />
              <AccountsOverview />
              <CurrencyConverter />
              <UpcomingBills />
            </div>
          </div>
        </div>
      </PageTransition>

      {/* AI Financial Advisor */}
      <FinancialAdvisor />
    </AppLayout>
  );
};

export default Dashboard;
